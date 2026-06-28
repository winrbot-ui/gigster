# Capture foreground window screenshot + Windows OCR (Windows 10+).
# Outputs recognized text to stdout; errors go to stderr.
$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public class GigsterWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  public static string CapturePng(string path) {
    IntPtr h = GetForegroundWindow();
    RECT r; GetWindowRect(h, out r);
    int w = r.Right - r.Left, hgt = r.Bottom - r.Top;
    if (w < 50 || hgt < 50) return "";
    using (var bmp = new Bitmap(w, hgt)) {
      using (var g = Graphics.FromImage(bmp)) {
        g.CopyFromScreen(r.Left, r.Top, 0, 0, bmp.Size);
      }
      bmp.Save(path, ImageFormat.Png);
    }
    return path;
  }
}
"@

$png = Join-Path $env:TEMP "gigster-ocr-$PID.png"
[void][GigsterWin]::CapturePng($png)
if (-not (Test-Path $png)) { exit 2 }

function Await($WinRtTask) {
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
    Select-Object -First 1
  $netTask = $asTask.MakeGenericMethod([Windows.Media.Ocr.OcrResult]).Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('en-US')) }
if ($null -eq $engine) { Write-Error 'OCR engine unavailable'; exit 3 }

$file = [Windows.Storage.StorageFile]::GetFileFromPathAsync($png).AsTask().Result
$stream = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read).AsTask().Result
$decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).AsTask().Result
$bitmap = $decoder.GetSoftwareBitmapAsync().AsTask().Result
$result = Await($engine.RecognizeAsync($bitmap))
$text = $result.Text
Remove-Item $png -Force -ErrorAction SilentlyContinue
if ([string]::IsNullOrWhiteSpace($text)) { exit 4 }
Write-Output $text
