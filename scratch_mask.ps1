Add-Type -AssemblyName System.Drawing

function Remove-WhiteBackground([string]$srcPath, [string]$destPath) {
    $bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
    $w = $bmp.Width
    $h = $bmp.Height
    
    # Create 32bpp ARGB bitmap
    $result = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    # Visited array for flood fill from edges
    $visited = New-Object 'bool[,]' $w, $h
    $queue = New-Object 'System.Collections.Generic.Queue[System.Drawing.Point]'
    
    # Add borders to queue
    for ($x = 0; $x -lt $w; $x++) {
        $queue.Enqueue((New-Object System.Drawing.Point($x, 0)))
        $queue.Enqueue((New-Object System.Drawing.Point($x, $h - 1)))
        $visited[$x, 0] = $true
        $visited[$x, $h - 1] = $true
    }
    for ($y = 0; $y -lt $h; $y++) {
        $queue.Enqueue((New-Object System.Drawing.Point(0, $y)))
        $queue.Enqueue((New-Object System.Drawing.Point($w - 1, $y)))
        $visited[0, $y] = $true
        $visited[$w - 1, $y] = $true
    }
    
    while ($queue.Count -gt 0) {
        $pt = $queue.Dequeue()
        $px = $bmp.GetPixel($pt.X, $pt.Y)
        # Check if white/near white (R>245, G>245, B>245)
        if ($px.R -gt 245 -and $px.G -gt 245 -and $px.B -gt 245) {
            # Check 4 neighbors
            $neighbors = @(
                (New-Object System.Drawing.Point($pt.X + 1, $pt.Y)),
                (New-Object System.Drawing.Point($pt.X - 1, $pt.Y)),
                (New-Object System.Drawing.Point($pt.X, $pt.Y + 1)),
                (New-Object System.Drawing.Point($pt.X, $pt.Y - 1))
            )
            foreach ($n in $neighbors) {
                if ($n.X -ge 0 -and $n.X -lt $w -and $n.Y -ge 0 -and $n.Y -lt $h) {
                    if (-not $visited[$n.X, $n.Y]) {
                        $visited[$n.X, $n.Y] = $true
                        $queue.Enqueue($n)
                    }
                }
            }
        }
    }
    
    # Now build result: if pixel was reached by flood fill and is near white, alpha = 0
    # Otherwise copy original pixel
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $px = $bmp.GetPixel($x, $y)
            if ($visited[$x, $y] -and $px.R -gt 240 -and $px.G -gt 240 -and $px.B -gt 240) {
                $result.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } else {
                $result.SetPixel($x, $y, $px)
            }
        }
    }
    
    # Also crop to notebook bounding box: X=[327..1037], Y=[147..625]
    $cropRect = New-Object System.Drawing.Rectangle(320, 140, 725, 490)
    $cropped = $result.Clone($cropRect, $result.PixelFormat)
    $cropped.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    $result.Dispose()
    $bmp.Dispose()
    Write-Output "Successfully processed $destPath"
}

Remove-WhiteBackground "c:\Users\Usuario\Downloads\between-letters\entre-cartas\fotos-nova-ui\CADERNO 2.png" "c:\Users\Usuario\Downloads\between-letters\entre-cartas\frontend\public\images\nova-ui\caderno-2-cutout.png"
Remove-WhiteBackground "c:\Users\Usuario\Downloads\between-letters\entre-cartas\fotos-nova-ui\CADERNO 3.png" "c:\Users\Usuario\Downloads\between-letters\entre-cartas\frontend\public\images\nova-ui\caderno-3-cutout.png"
