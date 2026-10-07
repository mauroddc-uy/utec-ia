pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
    }

    parameters {
        string(name: 'IMAGE_REGISTRY', defaultValue: 'registry.example.com', description: 'Registry host without protocol, for example ghcr.io.')
        string(name: 'IMAGE_REPOSITORY_PREFIX', defaultValue: 'utec-ia', description: 'Repository path/prefix used for backend and frontend images.')
        string(name: 'REGISTRY_CREDENTIALS_ID', defaultValue: 'utec-ia-registry', description: 'Jenkins username/password credential for docker login.')
        string(name: 'KUBECONFIG_CREDENTIALS_ID', defaultValue: 'utec-ia-kubeconfig', description: 'Jenkins file credential containing kubeconfig for the target namespace.')
        string(name: 'K8S_NAMESPACE', defaultValue: 'utec-ia-pilot', description: 'Kubernetes namespace for the pilot.')
        string(name: 'DEPLOY_BRANCH', defaultValue: 'main', description: 'Only this branch deploys. Pull requests never deploy.')
        string(name: 'IMAGE_PULL_SECRET', defaultValue: '', description: 'Optional existing Kubernetes imagePullSecret name in the namespace.')
        booleanParam(name: 'USE_PORT_FORWARD', defaultValue: true, description: 'Use kubectl port-forward to smoke test the real frontend Service.')
        string(name: 'FRONTEND_SMOKE_URL', defaultValue: 'http://127.0.0.1:18080', description: 'Frontend URL used by the smoke test.')
    }

    environment {
        STATE_DIR = '.jenkins/previous-state'
        PORT_FORWARD_LOG = '.jenkins/port-forward.log'
        PORT_FORWARD_PID = '.jenkins/port-forward.pid'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                    env.IMAGE_TAG = env.GIT_SHA.take(12)
                    env.GIT_BRANCH_NAME = env.BRANCH_NAME ?: sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD').trim()
                    env.BACKEND_IMAGE = "${params.IMAGE_REGISTRY}/${params.IMAGE_REPOSITORY_PREFIX}/backend:${env.IMAGE_TAG}"
                    env.FRONTEND_IMAGE = "${params.IMAGE_REGISTRY}/${params.IMAGE_REPOSITORY_PREFIX}/frontend:${env.IMAGE_TAG}"
                }
                sh 'rm -rf "$STATE_DIR" "$PORT_FORWARD_PID" "$PORT_FORWARD_LOG" && mkdir -p "$STATE_DIR"'
            }
        }

        stage('Verify Agent Tools') {
            steps {
                sh '''
                    set -eu
                    command -v curl
                    command -v sed
                    docker version
                    kubectl version --client
                '''
            }
        }

        stage('Backend Tests') {
            steps {
                sh '''
                    set -eu
                    tar -C backend -cf - . \
                      | docker run --rm -i python:3.12-slim sh -c "\
                          mkdir -p /app \
                          && tar -C /app -xf - \
                          && cd /app \
                          && python -m pip install --no-cache-dir -r requirements-dev.txt \
                          && python -m pytest"
                '''
            }
        }

        stage('Frontend Lint') {
            steps {
                sh '''
                    set -eu
                    tar -C frontend -cf - . \
                      | docker run --rm -i node:22-alpine sh -c "\
                          mkdir -p /app \
                          && tar -C /app -xf - \
                          && cd /app \
                          && npm ci \
                          && npm run lint"
                '''
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                    set -eu
                    docker build \
                      --build-arg UTEC_IA_VERSION="$IMAGE_TAG" \
                      --build-arg UTEC_IA_COMMIT_SHA="$GIT_SHA" \
                      -t "$BACKEND_IMAGE" \
                      backend

                    docker build \
                      --build-arg UTEC_IA_VERSION="$IMAGE_TAG" \
                      --build-arg UTEC_IA_COMMIT_SHA="$GIT_SHA" \
                      -t "$FRONTEND_IMAGE" \
                      frontend
                '''
            }
        }

        stage('Publish Images') {
            when {
                expression {
                    return !env.CHANGE_ID && env.GIT_BRANCH_NAME == params.DEPLOY_BRANCH
                }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: params.REGISTRY_CREDENTIALS_ID,
                    usernameVariable: 'REGISTRY_USERNAME',
                    passwordVariable: 'REGISTRY_PASSWORD'
                )]) {
                    sh '''
                        set -eu
                        echo "$REGISTRY_PASSWORD" | docker login "$IMAGE_REGISTRY" --username "$REGISTRY_USERNAME" --password-stdin
                        docker push "$BACKEND_IMAGE"
                        docker push "$FRONTEND_IMAGE"
                    '''
                }
            }
        }

        stage('Deploy Kubernetes') {
            when {
                expression {
                    return !env.CHANGE_ID && env.GIT_BRANCH_NAME == params.DEPLOY_BRANCH
                }
            }
            steps {
                withCredentials([file(credentialsId: params.KUBECONFIG_CREDENTIALS_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        set -eu
                        export KUBECONFIG="$KUBECONFIG_FILE"
                        mkdir -p "$STATE_DIR"

                        kubectl cluster-info

                        if kubectl get namespace "$K8S_NAMESPACE" >/dev/null 2>&1; then
                          kubectl -n "$K8S_NAMESPACE" get configmap utec-ia-config -o yaml > "$STATE_DIR/configmap.yaml" 2>/dev/null || true
                          kubectl -n "$K8S_NAMESPACE" get deployment/backend -o jsonpath='{.spec.template.spec.containers[?(@.name=="backend")].image}' > "$STATE_DIR/backend-image.txt" 2>/dev/null || true
                          kubectl -n "$K8S_NAMESPACE" get deployment/backend -o jsonpath='{.spec.template.spec.containers[?(@.name=="backend")].env[?(@.name=="UTEC_IA_VERSION")].value}' > "$STATE_DIR/backend-version.txt" 2>/dev/null || true
                          kubectl -n "$K8S_NAMESPACE" get deployment/backend -o jsonpath='{.spec.template.spec.containers[?(@.name=="backend")].env[?(@.name=="UTEC_IA_COMMIT_SHA")].value}' > "$STATE_DIR/backend-commit.txt" 2>/dev/null || true
                          kubectl -n "$K8S_NAMESPACE" get deployment/frontend -o jsonpath='{.spec.template.spec.containers[?(@.name=="frontend")].image}' > "$STATE_DIR/frontend-image.txt" 2>/dev/null || true
                        else
                          : > "$STATE_DIR/backend-image.txt"
                          : > "$STATE_DIR/backend-version.txt"
                          : > "$STATE_DIR/backend-commit.txt"
                          : > "$STATE_DIR/frontend-image.txt"
                        fi

                        touch "$STATE_DIR/deploy-started"

                        kubectl kustomize k8s/base \
                          | sed -e "s/name: utec-ia-pilot/name: ${K8S_NAMESPACE}/g" \
                                -e "s/namespace: utec-ia-pilot/namespace: ${K8S_NAMESPACE}/g" \
                          | kubectl apply -f -

                        if [ -n "$IMAGE_PULL_SECRET" ]; then
                          kubectl -n "$K8S_NAMESPACE" patch serviceaccount utec-ia-backend --type merge -p "{\\"imagePullSecrets\\":[{\\"name\\":\\"$IMAGE_PULL_SECRET\\"}]}"
                          kubectl -n "$K8S_NAMESPACE" patch serviceaccount utec-ia-frontend --type merge -p "{\\"imagePullSecrets\\":[{\\"name\\":\\"$IMAGE_PULL_SECRET\\"}]}"
                        fi

                        kubectl -n "$K8S_NAMESPACE" set image deployment/backend backend="$BACKEND_IMAGE"
                        kubectl -n "$K8S_NAMESPACE" set image deployment/frontend frontend="$FRONTEND_IMAGE"
                        kubectl -n "$K8S_NAMESPACE" set env deployment/backend UTEC_IA_VERSION="$IMAGE_TAG" UTEC_IA_COMMIT_SHA="$GIT_SHA"

                        kubectl -n "$K8S_NAMESPACE" rollout status deployment/backend --timeout=120s
                        kubectl -n "$K8S_NAMESPACE" rollout status deployment/frontend --timeout=120s
                    '''
                }
            }
        }

        stage('Smoke Test') {
            when {
                expression {
                    return !env.CHANGE_ID && env.GIT_BRANCH_NAME == params.DEPLOY_BRANCH
                }
            }
            steps {
                withCredentials([file(credentialsId: params.KUBECONFIG_CREDENTIALS_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        set -eu
                        export KUBECONFIG="$KUBECONFIG_FILE"

                        if [ "$USE_PORT_FORWARD" = "true" ]; then
                          kubectl -n "$K8S_NAMESPACE" port-forward svc/frontend 18080:80 > "$PORT_FORWARD_LOG" 2>&1 &
                          echo "$!" > "$PORT_FORWARD_PID"
                        fi

                        sh scripts/smoke-test.sh "$FRONTEND_SMOKE_URL" "$IMAGE_TAG" "$GIT_SHA"
                    '''
                }
            }
        }
    }

    post {
        failure {
            script {
                if (fileExists("${env.STATE_DIR}/deploy-started")) {
                    withCredentials([file(credentialsId: params.KUBECONFIG_CREDENTIALS_ID, variable: 'KUBECONFIG_FILE')]) {
                        sh '''
                            set +e
                            export KUBECONFIG="$KUBECONFIG_FILE"
                            if [ "$USE_PORT_FORWARD" = "true" ] && [ ! -f "$PORT_FORWARD_PID" ]; then
                              kubectl -n "$K8S_NAMESPACE" port-forward svc/frontend 18080:80 > "$PORT_FORWARD_LOG" 2>&1 &
                              echo "$!" > "$PORT_FORWARD_PID"
                              sleep 3
                            fi
                            sh scripts/k8s-recover.sh "$K8S_NAMESPACE" "$STATE_DIR" "$FRONTEND_SMOKE_URL"
                            kubectl -n "$K8S_NAMESPACE" get pods -o wide
                            kubectl -n "$K8S_NAMESPACE" get events --sort-by=.lastTimestamp | tail -n 30
                        '''
                    }
                } else {
                    echo 'No se inicio despliegue; no corresponde rollback.'
                }
            }
        }

        always {
            script {
                if (fileExists(env.PORT_FORWARD_PID)) {
                    sh '''
                        set +e
                        kill "$(cat "$PORT_FORWARD_PID")" 2>/dev/null
                        rm -f "$PORT_FORWARD_PID"
                    '''
                }
            }
        }
    }
}
