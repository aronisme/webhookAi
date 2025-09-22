# URL WebApp GAS (ganti sesuai punyamu)
$uri = "https://script.google.com/macros/s/AKfycbz_tSOAcbpLkBIaWFKRjv9VrvgTILy64tFrFyU5YMTZOo01RBOAgdKuenieS4SdIppN/exec"

# Tanggal hari ini
$today = Get-Date -Format "yyyy-MM-dd"

# Daftar jadwal harian
$events = @(
    @{ text = "Bangun, minum air hangat";      time = "06:00" },
    @{ text = "Olahraga ringan (stretching)";  time = "06:15" },
    @{ text = "Sarapan sehat";                 time = "06:45" },
    @{ text = "Cek email / agenda singkat";    time = "07:00" },
    @{ text = "Mulai kerja fokus (deep work)"; time = "08:00" },
    @{ text = "Break singkat, minum kopi";     time = "09:30" },
    @{ text = "Meeting / cek progres tim";     time = "10:00" },
    @{ text = "Kerja fokus lanjutan";          time = "11:00" },
    @{ text = "Makan siang";                   time = "12:00" },
    @{ text = "Power nap 20 menit";            time = "13:00" },
    @{ text = "Kerja proyek utama";            time = "13:30" },
    @{ text = "Stretching / kopi sore";        time = "15:00" },
    @{ text = "Balas email & update dokumen";  time = "15:30" },
    @{ text = "Evaluasi progres harian";       time = "17:00" },
    @{ text = "Selesai kerja, istirahat";      time = "18:00" },
    @{ text = "Quality time keluarga";         time = "19:00" },
    @{ text = "Belajar / baca buku";           time = "20:00" },
    @{ text = "Planning besok + jurnal";       time = "21:00" },
    @{ text = "Relaksasi / meditasi";          time = "22:00" },
    @{ text = "Persiapan tidur";               time = "23:00" },
    @{ text = "Tidur";                         time = "23:30" }
)

# Loop kirim ke GAS
foreach ($event in $events) {
    $body = @{
        command = "addschedule"
        text    = "$($event.text) | $today" + "T$($event.time)"
    } | ConvertTo-Json -Depth 3

    $res = Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $body
    Write-Output $res
}
