Dim projectDir, port, shell, fso, lockFile, result, i

projectDir = "d:\Javan\Cluade Code\business\BB OIG Shop"
port       = 3000
lockFile   = projectDir & "\.oig-starting"

Set shell = CreateObject("WScript.Shell")
Set fso   = CreateObject("Scripting.FileSystemObject")

' Remove stale lock (older than 120 s — means a previous startup crashed)
If fso.FileExists(lockFile) Then
    If DateDiff("s", fso.GetFile(lockFile).DateCreated, Now()) > 120 Then
        fso.DeleteFile lockFile
    End If
End If

' 1) Server already running — open browser immediately
result = shell.Run("cmd /c netstat -ano | findstr :" & port & " | findstr LISTENING", 0, True)
If result = 0 Then
    shell.Run "http://localhost:" & port

' 2) Lock exists — another click is already starting it, just wait
ElseIf fso.FileExists(lockFile) Then
    shell.Popup "OIG Shop is already starting — please wait.", 5, "OIG Shop", 64
    For i = 1 To 40
        WScript.Sleep 3000
        result = shell.Run("cmd /c netstat -ano | findstr :" & port & " | findstr LISTENING", 0, True)
        If result = 0 Then Exit For
    Next
    If result = 0 Then
        ' Block until Next.js finishes compiling and serves a real page
        Dim httpWait
        Set httpWait = CreateObject("MSXML2.ServerXMLHTTP.6.0")
        httpWait.SetTimeouts 5000, 5000, 90000, 90000
        On Error Resume Next
        httpWait.Open "GET", "http://localhost:" & port & "/", False
        httpWait.Send
        Err.Clear
        On Error GoTo 0
        shell.Run "http://localhost:" & port
    End If

' 3) First click — start the server
Else
    fso.CreateTextFile(lockFile, True).Close
    shell.Popup "OIG Shop is starting." & vbCrLf & "Usually 1-3 minutes. Do NOT click again.", 5, "OIG Shop", 64

    ' Cap heap at 1 GB so compilation doesn't eat all RAM
    shell.Run "cmd /c cd /D """ & projectDir & """ && set NODE_OPTIONS=--max-old-space-size=1024 && npm run dev", 0, False

    ' Phase 1: wait for Node to bind the port (up to 3 min)
    For i = 1 To 90
        WScript.Sleep 2000
        result = shell.Run("cmd /c netstat -ano | findstr :" & port & " | findstr LISTENING", 0, True)
        If result = 0 Then Exit For
    Next

    If fso.FileExists(lockFile) Then fso.DeleteFile lockFile

    If result = 0 Then
        ' Phase 2: block until Next.js finishes compiling and serves HTTP 200
        ' Opening the browser BEFORE this causes a RAM spike that crashes the machine
        Dim http
        Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
        http.SetTimeouts 5000, 5000, 300000, 300000
        On Error Resume Next
        http.Open "GET", "http://localhost:" & port & "/", False
        http.Send
        Err.Clear
        On Error GoTo 0
        shell.Run "http://localhost:" & port
        shell.Run "powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & projectDir & "\Stop OIG Shop (Tray).ps1"""
    Else
        MsgBox "OIG Shop could not start after 3 minutes." & vbCrLf & _
               "Open a terminal in the project folder and run: npm run dev", _
               vbExclamation, "OIG Shop Error"
    End If
End If
