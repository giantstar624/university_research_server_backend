import { _InstanceType, EC2Client, ResourceType, RunInstancesCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
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
        ImageId: 'ami-031038a3a0bcff4fa', // Replace with your AMI ID
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
async function getInstanceIPsByTag(tagKey: string, tagValue: string): Promise<string[]> {
    const ipAddresses: string[] = [];

    try {
        // DescribeInstancesCommand to fetch instances
        const describeInstancesCommand = new DescribeInstancesCommand({
            Filters: [
                {
                    Name: 'instance-state-name',
                    Values: ['running'] // Filter for running instances
                },
                {
                    Name: 'tag:' + tagKey,
                    Values: [tagValue] // Filter by tag key and value
                }
            ]
        });

        // Send command
        const response = await ec2Client.send(describeInstancesCommand);

        // Process the response
        const instances = response.Reservations?.flatMap(reservation => reservation.Instances) || [];

        instances.forEach(instance => {
            if (instance!.PublicIpAddress) {
                ipAddresses.push(instance!.PublicIpAddress);
            }
        });

        return ipAddresses;
    } catch (error) {
        console.error('Error fetching instances:', error);
        throw error;
    }
}
export default { run, getInstanceIPsByTag };