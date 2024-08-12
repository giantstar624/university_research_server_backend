import { _InstanceType, EC2Client, ResourceType, RunInstancesCommand } from "@aws-sdk/client-ec2";
import { fromEnv } from '@aws-sdk/credential-provider-env'
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();
const ec2Client = new EC2Client({
    region: process.env.AWS_REGION,
    credentials: fromEnv()
}); // Adjust region as needed

// Define your user data script (Base64 encoded for security and transmission)
const userData = `
<powershell>
# Set execution policy to allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force

# Navigate to your project directory
Set-Location -Path "C:\\Users\\Administrator\\Documents\\university_research_agent"

# Run the application
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run dev" -PassThru
</powershell>
`;

// Base64 encode the user data
const userDataBase64 = Buffer.from(userData).toString('base64');

// Define parameters for the new EC2 instance


// Launch the instance
const run = async (cnt: number) => {
    const params = {
        ImageId: 'ami-09b7d582b147f8b00', // Replace with your AMI ID
        InstanceType: _InstanceType.t2_large, // Corrected to string format
        MinCount: cnt,
        MaxCount: cnt,
        UserData: userDataBase64, // Ensure this is base64 encoded
        KeyName: 'main', // Replace with your key pair name
        SecurityGroupIds: ['sg-028e00443c9b52ff9'],
        TagSpecifications: [
            {
                ResourceType: ResourceType.instance,
                Tags: [
                    {
                        Key: 'Name',
                        Value: 'MyInstance'
                    }
                ]
            }
        ]
    };
    console.log(ec2Client.config);
    try {
        const command = new RunInstancesCommand(params);
        const response = await ec2Client.send(command);
        console.log('Instance launched successfully:', response.Instances);
    } catch (error) {
        console.error('Error launching instance:', error);
    }
};
export default run;