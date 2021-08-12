REM ================================================================
REM Find Advanced Installer Path
REM ================================================================

SET KEY_NAME=HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment
SET VALUE_NAME=PROCESSOR_ARCHITECTURE
SET ROOT_FOLDER=%~dp0

for /F "usebackq tokens=3" %%A IN (`reg query "%KEY_NAME%" /v "%VALUE_NAME%" 2^>nul ^| find "%VALUE_NAME%"`) do (
  If %%A==AMD64 SET OS_TYPE=AMD64
  If %%A==x86 SET OS_TYPE=X86
)

SET AI_VALUE_NAME=Advanced Installer Path
IF %PROCESSOR_ARCHITECTURE%==AMD64 SET AI_KEY_NAME=HKLM\SOFTWARE\Wow6432Node\Caphyon\Advanced Installer
IF %PROCESSOR_ARCHITECTURE%==x86 SET AI_KEY_NAME=HKLM\SOFTWARE\Caphyon\Advanced Installer
for /F "usebackq skip=2 tokens=4*" %%A IN (`reg query "%AI_KEY_NAME%" /v "%AI_VALUE_NAME%" 2^>nul`) do (
  SET ADVANCEDINSTALLER_PATH=%%B
)

set ADVANCEDINSTALLER_COM="%ADVANCEDINSTALLER_PATH%\bin\x86"
echo Advanced Insteller Path : %ADVANCEDINSTALLER_COM%

REM ================================================================
REM set AIP path
REM ================================================================

SET AIP_PATH="%ROOT_FOLDER%\project.aip"

REM ================================================================
REM call Advanced Installer to build AIP
REM ================================================================

CD /D %ADVANCEDINSTALLER_COM%
CALL AdvancedInstaller.com /rebuild %AIP_PATH%
