### I am using @capgo/capacitor-social-login instead of @codetrix-studio/capacitor-google-auth
### My SHA-1 debug key is 164410585415-sanr91ab4c9b8mt71uao549lunemms5b.apps.googleusercontent.com
### My SHA-1 release key is 164410585415-i7noqqquug7ae6utkpre5rdhklrlgiqo.apps.googleusercontent.com
### I am creating both the debug and release android app through github workflow (release-apks.yml)
### The SHA-1 keys are added in both firebase and google cloud platform 
### My package name is com.samarth.ignite
### I have created separate google cloud OAuth 2.0 Client IDs for debug and release as google cloud doesn't support both release and debug keys in one client id
### Still after building the apks and installing the release apk, the google login isn't working. It is showing the error- OAUTH_ERROR: Google Sign-In failed: [28444] Developer console is not set up correctly. (Likely Google Console misconfiguration)
### Check my MainActivity.java file, capacitor.config.json file and google-services.json file
### And my web key is 164410585415-lc2ofbhvaqd028453ff66tq2na9n4uov.apps.googleusercontent.com