pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
    }

    parameters {
        string(name: 'DEPLOY_BRANCH', defaultValue: 'test', description: 'Rama autorizada para despliegue automatico.')
        string(name: 'VM_HOST_CREDENTIALS_ID', defaultValue: 'utec-ia-vm-host', description: 'Credencial Jenkins Secret text con la IP o DNS de la VM Ubuntu.')
        string(name: 'VM_PORT', defaultValue: '22', description: 'Puerto SSH de la VM.')
        string(name: 'VM_APP_DIR', defaultValue: '', description: 'Directorio remoto de despliegue. Si queda vacio, usa /home/<usuario_ssh>/utec-ia.')
        string(name: 'VM_FRONTEND_PORT', defaultValue: '8080', description: 'Puerto publicado por la VM para el frontend.')
        string(name: 'SSH_CREDENTIALS_ID', defaultValue: 'utec-ia-vm-ssh-file', description: 'Credencial Jenkins tipo SSH Username with private key.')
        string(name: 'BACKEND_IMAGE_NAME', defaultValue: 'utec-ia-backend', description: 'Nombre local de imagen backend.')
        string(name: 'FRONTEND_IMAGE_NAME', defaultValue: 'utec-ia-frontend', description: 'Nombre local de imagen frontend.')
    }

    environment {
        PACKAGE_DIR = '.jenkins/vm-package'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                    env.IMAGE_TAG = env.GIT_SHA.take(12)
                    def branchName = (env.BRANCH_NAME ?: sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD')).trim()
                    def deployBranch = (params.DEPLOY_BRANCH ?: '').trim()
                    env.GIT_BRANCH_NAME = branchName.replaceFirst(/^origin\//, '')
                    env.DEPLOY_BRANCH_NAME = deployBranch.replaceFirst(/^origin\//, '')
                    env.SHOULD_DEPLOY = (!env.CHANGE_ID && env.GIT_BRANCH_NAME == env.DEPLOY_BRANCH_NAME) ? 'true' : 'false'

                    echo """
Deploy gate:
  branch=${env.GIT_BRANCH_NAME}
  deployBranch=${env.DEPLOY_BRANCH_NAME}
  changeId=${env.CHANGE_ID ?: ''}
  shouldDeploy=${env.SHOULD_DEPLOY}
"""
                }
                sh 'rm -rf .jenkins && mkdir -p "$PACKAGE_DIR"'
            }
        }

        stage('Verify Agent') {
            steps {
                sh '''
                    set -eu
                    command -v curl
                    command -v docker
                    command -v scp
                    command -v ssh
                    docker version
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
                      -t "${BACKEND_IMAGE_NAME}:${IMAGE_TAG}" \
                      backend

                    docker build \
                      --build-arg UTEC_IA_VERSION="$IMAGE_TAG" \
                      --build-arg UTEC_IA_COMMIT_SHA="$GIT_SHA" \
                      -t "${FRONTEND_IMAGE_NAME}:${IMAGE_TAG}" \
                      frontend
                '''
            }
        }

        stage('Deploy VM') {
            when {
                expression {
                    return env.SHOULD_DEPLOY == 'true'
                }
            }
            steps {
                script {
                    def deployScript = '''
                        set +x
                        set -eu
                        VM_HOST_EFFECTIVE="${VM_HOST_FROM_CREDENTIAL:-}"
                        VM_USER_EFFECTIVE="${SSH_USER_FROM_CREDENTIAL:-}"

                        if [ -z "$VM_HOST_EFFECTIVE" ]; then
                          echo "Falta credencial VM_HOST_CREDENTIALS_ID." >&2
                          exit 2
                        fi

                        if [ -z "$VM_USER_EFFECTIVE" ]; then
                          echo "Falta username en la credencial SSH." >&2
                          exit 2
                        fi

                        VM_HOST="$VM_HOST_EFFECTIVE" \
                        VM_USER="$VM_USER_EFFECTIVE" \
                        VM_PORT="$VM_PORT" \
                        VM_APP_DIR="${VM_APP_DIR:-/home/$VM_USER_EFFECTIVE/utec-ia}" \
                        SSH_KEY="$SSH_KEY" \
                        IMAGE_TAG="$IMAGE_TAG" \
                        BACKEND_IMAGE="$BACKEND_IMAGE_NAME" \
                        FRONTEND_IMAGE="$FRONTEND_IMAGE_NAME" \
                        FRONTEND_PORT="$VM_FRONTEND_PORT" \
                        UTEC_IA_VERSION="$IMAGE_TAG" \
                        UTEC_IA_COMMIT_SHA="$GIT_SHA" \
                        UTEC_IA_ENVIRONMENT="vm-ubuntu" \
                        sh scripts/vm-deploy.sh
                    '''

                    def sshCredential = sshUserPrivateKey(
                        credentialsId: params.SSH_CREDENTIALS_ID,
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER_FROM_CREDENTIAL'
                    )

                    withCredentials([
                        sshCredential,
                        string(credentialsId: params.VM_HOST_CREDENTIALS_ID, variable: 'VM_HOST_FROM_CREDENTIAL')
                    ]) {
                        sh deployScript
                    }
                }
            }
        }

        stage('Smoke VM') {
            when {
                expression {
                    return env.SHOULD_DEPLOY == 'true'
                }
            }
            steps {
                script {
                    def smokeScript = '''
                        set +x
                        set -eu
                        VM_HOST_EFFECTIVE="${VM_HOST_FROM_CREDENTIAL:-}"

                        if [ -z "$VM_HOST_EFFECTIVE" ]; then
                          echo "Falta credencial VM_HOST_CREDENTIALS_ID." >&2
                          exit 2
                        fi

                        FRONTEND_SMOKE_URL="http://${VM_HOST_EFFECTIVE}:${VM_FRONTEND_PORT}"
                        sh scripts/smoke-test.sh "$FRONTEND_SMOKE_URL" "$IMAGE_TAG" "$GIT_SHA"
                    '''

                    withCredentials([string(credentialsId: params.VM_HOST_CREDENTIALS_ID, variable: 'VM_HOST_FROM_CREDENTIAL')]) {
                        sh smokeScript
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'rm -rf "$PACKAGE_DIR"'
        }
    }
}
