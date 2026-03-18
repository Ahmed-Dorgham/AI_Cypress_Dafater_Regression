pipeline {
    agent any

    environment {
        CYPRESS_CHROME_BINARY = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    }

    stages {
        stage('Checkout Repo B') {
            steps {
                git branch: 'main', url: 'https://github.com/Ahmed-Dorgham/Ai_Cypress_Dafater_Regression.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo "Installing npm dependencies..."
                bat 'npm install'
            }
        }

        stage('Diagnostics') {
            steps {
                bat 'whoami'
                bat 'dir "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"'
                bat 'npx cypress info'
            }
        }

        stage('Run Cypress Tests') {
            steps {
                echo "Running Cypress tests on Chrome (headed, specific spec)..."
              bat 'chcp 65001'
bat 'npx cypress run --browser chrome --headed --spec "cypress/e2e/addingItems.cy.js"'
            }
        }
    }

    post {
        always {
            echo "Pipeline finished."
        }
    }
}
