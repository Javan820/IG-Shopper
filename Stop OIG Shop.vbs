Dim shell, result
Set shell = CreateObject("WScript.Shell")

result = shell.Run("cmd /c netstat -ano | findstr :3000 | findstr LISTENING", 0, True)
If result <> 0 Then
    MsgBox "OIG Shop server is not running.", vbInformation, "OIG Shop"
Else
    shell.Run "powershell -Command ""(Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }""", 0, True
    MsgBox "OIG Shop server stopped.", vbInformation, "OIG Shop"
End If
