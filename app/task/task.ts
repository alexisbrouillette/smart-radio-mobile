import ReactNativeForegroundService from "@supersami/rn-foreground-service";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

let registered = false;
export const checkPermission = async () => {
    const { status } = await Audio.getPermissionsAsync();
    console.log("Audio permission status:", status);
      if (status !== "granted") {
        const permission = await Audio.requestPermissionsAsync();
      }
      //if (permission.granted) {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            staysActiveInBackground: true,
            playThroughEarpieceAndroid: true,
          });
          console.log("Audio mode set");
     //   }
}

export const registerTaskService = () => {
    if (ReactNativeForegroundService) {
      ReactNativeForegroundService.register({
        config: {
          alert: true,
          onServiceErrorCallBack: () => {
            console.error("Foreground service error occurred");
          },
        }
      });
      registered = true;
    } else {
      console.error("ReactNativeForegroundService is null");
    }
}

export const createTask = async () => {
    try {
      console.log("Magic Starting task");
    if (ReactNativeForegroundService) {
      await ReactNativeForegroundService.start({
        id: 1244,
        title: 'Foreground Service',
        message: 'We are live World',
        icon: 'ic_launcher_background',
        button: true,
        button2: true,
        buttonText: 'Button',
        button2Text: 'Anther Button',
        buttonOnPress: 'cray',
        setOnlyAlertOnce: 'true',
        color: '#000000',
        progress: {
          max: 100,
          curr: 50,
        },
        // @ts-ignore
        ServiceType: 'mediaPlayback',
      });
    } else {
      console.error("ReactNativeForegroundService is null");
    }
    }
    catch (e) {
      console.log("Error stopping task", e);
    }
    
  };
