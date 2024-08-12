<powershell>
# Set execution policy to allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force

# Navigate to your project directory
Set-Location -Path "C:\Users\Administrator\Documents\university_research_agent"

# Run the application
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run dev" -PassThru
</powershell>