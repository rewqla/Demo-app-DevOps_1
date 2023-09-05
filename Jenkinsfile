pipeline {
    agent any
    environment {
        region = 'eu-north-1'  
        ami = 'ami-065681da47fb4e433'            
        count = '1'              
        type = 't3.micro'        
        key = 'keyyer'        
        sg = 'sg-09cb9e609940dc0da' 
        sb = 'subnet-09c5fc0d20069298c'
        publicIP = ''
        sshUser = 'ec2-user'
        instanceId =''
        DockerCred=credentials('docker')
    }
    
    stages {
        stage('Launch EC2 Instance') {
            steps {
                script {
                    def instanceInfo = sh(script: """
                        aws ec2 run-instances \
                            --image-id \$ami \
                            --count \$count \
                            --instance-type \$type \
                            --key-name \$key \
                            --security-group-ids \$sg \
                            --subnet-id \$sb \
                            --region \$region
                    """, returnStdout: true).trim()
                    
                    def privateIP = sh(script: """
                    echo '${instanceInfo}' | jq -r '.Instances[0].PrivateIpAddress'
                    """, returnStdout: true).trim()
                    
                    instanceId = sh(script: """
                        echo '${instanceInfo}' | jq -r '.Instances[0].InstanceId'
                    """, returnStdout: true).trim()
                    
                    publicIP = sh(
                        script: """
                            aws ec2 describe-network-interfaces \
                                --filters "Name=private-ip-address,Values=${privateIP}" \
                                --query 'NetworkInterfaces[0].Association.PublicIp' \
                                --region \$region \
                                --output text
                        """,
                        returnStdout: true
                    ).trim()
                }
            }
        }
        stage('Install Docker on EC2 Instance') {
            steps {
                script {
                    retry(2){
                    sleep(time: 10, unit: 'SECONDS')
                    sshagent(['ssh-agent']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${sshUser}@${publicIP} \
                            "sudo yum update -y && sudo yum install docker -y && sudo service docker start && sudo usermod -aG docker ${sshUser} && sudo yum install git -y"
                        """
                    }
                    }
                }
            }
        }
        stage('Clone git, built docker, push to Dockerhub'){
            steps{
                script {
                    sshagent(['ssh-agent']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${sshUser}@${publicIP}  \
                            "git clone https://github.com/rewqla/demo_app_DevOps_1.git && cd demo_app_DevOps_1 && docker build -t rewqla/webapp:latest . && docker run -itd -p 80:80 --name webapp rewqla/webapp && docker login -u $DockerCred_USR -p $DockerCred_PSW && docker push rewqla/webapp:latest"
                        """
                    }
                }
            }
        }
    }
    post {
        failure {
            script {
                sh "aws ec2 terminate-instances --instance-ids ${instanceId}"
            }
        }
    }
}
