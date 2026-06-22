' Rebuild OIG Shop after code changes.
' The normal "Start OIG Shop.vbs" reuses the existing production build for fast
' startup, so it does NOT pick up code changes on its own. Run THIS after
' changing code: it stops the running server, rebuilds, and starts fresh.

Dim projectDir, port, shell, fso, lockFile, result, i

projectDir = "d:\Javan\Cluade Code\business\BB OIG Shop"
port       = 3000
lockFile   = projectDir & "\.oig-starting"

Set shell = CreateObject("WScript.Shell")
Set fso   = CreateObject("Scripting.FileSystemObject")

If MsgBox("Rebuild OIG Shop with the latest code?" & vbCrLf & vbCrLf & _
          "This stops the running server and rebuilds (1-3 minutes).", _
          vbOKCancel + vbQuestion, "OIG Shop — Rebuild") <> vbOK Then
    WScript.Quit
End If

' Stop any server currently holding the port.
shell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :" & port & " ^| findstr LISTENING') do taskkill /F /PID %a", 0, True
WScript.Sleep 1500

If fso.FileExists(lockFile) Then fso.DeleteFile lockFile
fso.CreateTextFile(lockFile, True).Close

shell.Popup "Rebuilding OIG Shop. 1-3 minutes — do NOT click again.", 8, "OIG Shop", 64

' Rebuild (blocking), then start the production server.
shell.Run "cmd /c cd /D """ & projectDir & """ && set NODE_OPTIONS=--max-old-space-size=1536 && npm run build", 0, True
shell.Run "cmd /c cd /D """ & projectDir & """ && set NODE_OPTIONS=--max-old-space-size=1536 && npm run start", 0, False

' Wait for the port to come up (up to 2 min).
For i = 1 To 60
    WScript.Sleep 2000
    result = shell.Run("cmd /c netstat -ano | findstr :" & port & " | findstr LISTENING", 0, True)
    If result = 0 Then Exit For
Next

If fso.FileExists(lockFile) Then fso.DeleteFile lockFile

If result = 0 Then
    Dim http
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.SetTimeouts 5000, 5000, 120000, 120000
    On Error Resume Next
    http.Open "GET", "http://localhost:" & port & "/", False
    http.Send
    Err.Clear
    On Error GoTo 0
    shell.Run "http://localhost:" & port
    shell.Run "powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & projectDir & "\Stop OIG Shop (Tray).ps1"""
Else
    MsgBox "Rebuild failed to start the server." & vbCrLf & _
           "Open a terminal in the project folder and run: npm run build then npm run start", _
           vbExclamation, "OIG Shop Error"
End If
