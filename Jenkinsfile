def runCommand(String unixCommand, String windowsCommand) {
    if (isUnix()) {
        sh unixCommand
    } else {
        powershell windowsCommand
    }
}

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        IMAGE_NAME = 'utec-ia'
        IMAGE_TAG = "${BUILD_NUMBER}"
        CONTAINER_NAME = "utec-ia-ci-${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    runCommand(
                        'docker build -t "$IMAGE_NAME:$IMAGE_TAG" .',
                        'docker build -t "$($env:IMAGE_NAME):$($env:IMAGE_TAG)" .'
                    )
                }
            }
        }

        stage('Validate App') {
            steps {
                script {
                    runCommand(
                        'docker run --rm "$IMAGE_NAME:$IMAGE_TAG" python -m compileall app',
                        'docker run --rm "$($env:IMAGE_NAME):$($env:IMAGE_TAG)" python -m compileall app'
                    )
                }
            }
        }

        stage('Smoke Test') {
            steps {
                script {
                    runCommand(
                        '''
                        docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
                        docker run -d --name "$CONTAINER_NAME" "$IMAGE_NAME:$IMAGE_TAG"

                        for i in $(seq 1 30); do
                            if docker exec "$CONTAINER_NAME" python -c "import urllib.request; response = urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2); assert response.status == 200" >/dev/null 2>&1; then
                                docker exec "$CONTAINER_NAME" python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).read().decode())"
                                exit 0
                            fi
                            sleep 1
                        done

                        docker logs "$CONTAINER_NAME"
                        exit 1
                        ''',
                        '''
                        docker rm -f $env:CONTAINER_NAME 2>$null | Out-Null
                        docker run -d --name $env:CONTAINER_NAME "$($env:IMAGE_NAME):$($env:IMAGE_TAG)"

                        for ($i = 1; $i -le 30; $i++) {
                            docker exec $env:CONTAINER_NAME python -c "import urllib.request; response = urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2); assert response.status == 200" >$null 2>$null
                            if ($LASTEXITCODE -eq 0) {
                                docker exec $env:CONTAINER_NAME python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).read().decode())"
                                exit 0
                            }
                            Start-Sleep -Seconds 1
                        }

                        docker logs $env:CONTAINER_NAME
                        exit 1
                        '''
                    )
                }
            }
        }
    }

    post {
        always {
            script {
                runCommand(
                    'docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true',
                    'docker rm -f $env:CONTAINER_NAME 2>$null | Out-Null'
                )
            }
        }

        success {
            echo 'Pipeline finalizado correctamente.'
        }

        failure {
            echo 'Pipeline fallido. Revisar logs del build o del smoke test.'
        }
    }
}
