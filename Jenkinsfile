@Library("Shared") _
pipeline {
    agent { label "worker" }

    options {
        disableConcurrentBuilds()
    }

    stages {

        stage("Code") {
            steps {
                script{
                    clone("https://github.com/Aeagon07/ImmutableOps.git", "main")
                }
            }
        }

        stage("Setup Env") {
            steps {
                withCredentials([file(credentialsId: 'firebase-env-file', variable: 'ENV_FILE')]) {
                    sh 'cp $ENV_FILE canteen-app/.env'
                }
            }
        }

        stage("Clean") {
            steps {
                script{
                    cleanDocker()
                }
            }
        }

        stage("Build") {
            steps {
                script{
                    cafesync_build("canteen-app", "latest", "aeagon07")
                }
            }
        }

        stage("Deploy") {
            steps {
                sh '''
                docker rm -f canteen-app || true
                docker run -d -p 8000:5173 --name canteen-app canteen-app:latest
                '''
            }
        }
    }
}
