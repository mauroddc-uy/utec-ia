pipeline {
    agent any

    environment {
        IMAGE_NAME = 'utec-ia'
        CONTAINER_NAME = 'utec-ia-container'

        VM_IP = '192.168.193.183'
        VM_USER = 'matias'
        SSH_CREDS = 'ssh vm'
    }

    stages {

        stage('Descargar código') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/mauroddc-uy/utec-ia.git'
            }
        }

        stage('Construir Imagen Docker') {
            steps {
                script {
                    docker.build("${IMAGE_NAME}:latest")
                }
            }
        }

        stage('Empaquetar Imagen') {
            steps {
                echo 'Convirtiendo imagen a archivo .tar para enviarla...'
                sh "docker save ${IMAGE_NAME}:latest -o ${IMAGE_NAME}.tar"
            }
        }

        stage('Enviar a VM de VMware') {
            steps {
                echo 'Enviando archivo por SSH a la VM...'

                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: "${SSH_CREDS}",
                        keyFileVariable: 'SSH_KEY'
                    )
                ]) {
                    sh '''
                        scp -i $SSH_KEY \
                        -o StrictHostKeyChecking=no \
                        ${IMAGE_NAME}.tar \
                        ${VM_USER}@${VM_IP}:/tmp/${IMAGE_NAME}.tar
                    '''
                }
            }
        }

        stage('Desplegar en VM de VMware') {
            steps {
                echo 'Levantando el contenedor en la VM remota...'

                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: "${SSH_CREDS}",
                        keyFileVariable: 'SSH_KEY'
                    )
                ]) {
                    sh """
                        ssh -i \$SSH_KEY \
                        -o StrictHostKeyChecking=no \
                        ${VM_USER}@${VM_IP} '

                            echo "Deteniendo contenedor anterior..."
                            docker stop ${CONTAINER_NAME} || true
                            docker rm ${CONTAINER_NAME} || true

                            echo "Cargando nueva imagen..."
                            docker load -i /tmp/${IMAGE_NAME}.tar

                            echo "Levantando nuevo contenedor..."
                            docker run -d \
                                -p 80:8000 \
                                --name ${CONTAINER_NAME} \
                                ${IMAGE_NAME}:latest

                            echo "Limpiando archivo temporal..."
                            rm /tmp/${IMAGE_NAME}.tar
                        '
                    """
                }
            }
        }
    }

    post {
        always {
            echo 'Limpiando archivos temporales en Jenkins...'
            sh "rm -f ${IMAGE_NAME}.tar"
        }

        success {
            echo "¡Despliegue exitoso en la VM ${VM_IP}!"
        }

        failure {
            echo 'El despliegue falló. Revisa los logs.'
        }
    }
}