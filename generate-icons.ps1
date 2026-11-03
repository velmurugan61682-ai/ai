Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Administrator\.gemini\antigravity\brain\281683ea-d8c0-435c-8308-6bdd34ef159d\.user_uploaded\media_1793682850182_c24a7390.jpg"
$projectRoot = "C:\Users\Administrator\Documents\velmurugan_project\ai_own\ai"
$assetsDir = Join-Path $projectRoot "assets"
$publicDir = Join-Path $projectRoot "public"

if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

function Save-ResizedImage {
    param(
        [System.Drawing.Image]$srcImg,
        [int]$width,
        [int]$height,
        [string]$destPath
    )
    $destDir = Split-Path -Path $destPath
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $graphics.DrawImage($srcImg, $rect)
    $graphics.Dispose()
    
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Created: $destPath ($width x $height)"
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

# 1. Assets folder
Save-ResizedImage $srcImg 1024 1024 (Join-Path $assetsDir "ai-brain-icon-1024.png")
Save-ResizedImage $srcImg 1024 1024 (Join-Path $assetsDir "icon.png")
Save-ResizedImage $srcImg 1024 1024 (Join-Path $assetsDir "adaptive-icon.png")
Save-ResizedImage $srcImg 64 64 (Join-Path $assetsDir "favicon.png")

# 2. Public folder for Web & PWA
Save-ResizedImage $srcImg 1024 1024 (Join-Path $publicDir "ai-brain-icon-1024.png")
Save-ResizedImage $srcImg 512 512 (Join-Path $publicDir "icon-512.png")
Save-ResizedImage $srcImg 192 192 (Join-Path $publicDir "icon-192.png")
Save-ResizedImage $srcImg 64 64 (Join-Path $publicDir "favicon.png")

# 3. Android Mipmap icons
$resDir = Join-Path $projectRoot "android\app\src\main\res"

$mipmaps = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($item in $mipmaps.GetEnumerator()) {
    $folder = Join-Path $resDir $item.Key
    $size = $item.Value
    
    # Save as PNG
    Save-ResizedImage $srcImg $size $size (Join-Path $folder "ic_launcher.png")
    Save-ResizedImage $srcImg $size $size (Join-Path $folder "ic_launcher_round.png")
    
    # Remove old default .webp launcher icons so Android uses new .png
    $oldWebp1 = Join-Path $folder "ic_launcher.webp"
    $oldWebp2 = Join-Path $folder "ic_launcher_round.webp"
    if (Test-Path $oldWebp1) { Remove-Item $oldWebp1 -Force }
    if (Test-Path $oldWebp2) { Remove-Item $oldWebp2 -Force }
}

# 4. Android Splashscreen drawables
$drawables = @{
    "drawable-mdpi" = 160
    "drawable-hdpi" = 240
    "drawable-xhdpi" = 320
    "drawable-xxhdpi" = 480
    "drawable-xxxhdpi" = 640
}

foreach ($item in $drawables.GetEnumerator()) {
    $folder = Join-Path $resDir $item.Key
    $size = $item.Value
    Save-ResizedImage $srcImg $size $size (Join-Path $folder "splashscreen_logo.png")
}

$srcImg.Dispose()
Write-Output "All icons generated successfully!"
