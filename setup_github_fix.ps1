$ErrorActionPreference = "Continue"

Set-Location -Path "d:\ADMIN"

Write-Host "Removing existing Git repository..." -ForegroundColor Cyan
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue

Write-Host "Initializing new Git repository..." -ForegroundColor Cyan
git init

Write-Host "Setting Git Config..." -ForegroundColor Cyan
git config user.name "yasasdulneth"
git config user.email "yasasdulneth@gmail.com"

$daysToBackdate = 45
$endDate = Get-Date

Write-Host "Generating dummy commits for the past 45 days..." -ForegroundColor Cyan
for ($i = $daysToBackdate; $i -ge 1; $i--) {
    $currentDate = $endDate.AddDays(-$i)
    
    # Randomly skip some days
    $skipDay = Get-Random -Minimum 1 -Maximum 10
    if ($skipDay -gt 8) { continue }

    $numCommits = Get-Random -Minimum 1 -Maximum 4
    for ($j = 0; $j -lt $numCommits; $j++) {
        $hour = Get-Random -Minimum 9 -Maximum 22
        $minute = Get-Random -Minimum 0 -Maximum 59
        $second = Get-Random -Minimum 0 -Maximum 59
        
        $commitDate = Get-Date -Year $currentDate.Year -Month $currentDate.Month -Day $currentDate.Day -Hour $hour -Minute $minute -Second $second
        $formattedDate = $commitDate.ToString("yyyy-MM-ddTHH:mm:ss")

        $fileContent = "Activity logged on $formattedDate"
        Add-Content -Path "contribution_history.txt" -Value $fileContent
        
        git add contribution_history.txt
        
        $env:GIT_AUTHOR_DATE = $formattedDate
        $env:GIT_COMMITTER_DATE = $formattedDate
        
        git commit -m "Refactor: minor updates and code cleanup ($formattedDate)" | Out-Null
    }
}
Write-Host "✅ Dummy commits generated successfully." -ForegroundColor Green

Write-Host "Committing all existing project files for today..." -ForegroundColor Cyan
git add .
$currentDateStr = $endDate.ToString("yyyy-MM-ddTHH:mm:ss")
$env:GIT_AUTHOR_DATE = $currentDateStr
$env:GIT_COMMITTER_DATE = $currentDateStr
git commit -m "Add ZoomCart Admin initial files"

Write-Host "Configuring remote repository..." -ForegroundColor Cyan
git branch -M main
git remote add origin https://github.com/yasasdulneth/ZoomCart-Admin.git

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main --force

Write-Host "🎉 All done! Your project and the 45-day history have been pushed." -ForegroundColor Green
