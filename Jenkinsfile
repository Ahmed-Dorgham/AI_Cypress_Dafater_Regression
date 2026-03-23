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

        stage('Install Cypress Binary') {
            steps {
                echo "Installing Cypress binary..."
                bat 'npx cypress install'
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
                echo "Running Cypress tests on Chrome..."
                bat '''
                set TERM=dumb
                set NO_COLOR=1
                set FORCE_COLOR=0
                npx cypress run --quiet --browser chrome --headed --spec "cypress/e2e/posView.cy.js" --reporter dot
                '''
            }
        }
    }

    post {
        always {
            echo "Pipeline finished."
        }
    }
}
