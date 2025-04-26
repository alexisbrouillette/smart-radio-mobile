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
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
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

export const createTask = () => {
    try {
      console.log("Magic Starting task");
    if (ReactNativeForegroundService) {
      ReactNativeForegroundService.start({
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


export const startTask = async () => {
    console.log("Awaited startTask");
    console.log(ReactNativeForegroundService.get_task('taskId'))
    console.log("Is running: ", ReactNativeForegroundService.is_task_running('taskId'));
    if (ReactNativeForegroundService) {
      if(ReactNativeForegroundService.is_task_running('taskId') != null) {
        console.log("ReactNativeForegroundService is not null and exists");
        ReactNativeForegroundService.remove_task('taskId');
        console.log("Stopped task");
      }
      console.log("ReactNativeForegroundService is not null and doenst exist");
      ReactNativeForegroundService.add_task(() => log1(), {
        delay: 1000,
        onLoop: true,
        taskId: 'taskId',
        onError: (e) => console.log(`Error logging:`, e),
      });
    } else {
      console.error("ReactNativeForegroundService is null");
    }
}

const log1 = () => {
    console.log("Logging...");
    playBackgroundSound();
    // while (true) {
    //   console.log('Logging...');
    //   await new Promise(resolve => setTimeout(resolve, 1000));
    // }
}


// Sound playing function
async function playBackgroundSound() {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/glass-break-316720.mp3')
    );
    await sound.playAsync();
    
    // Unload the sound after playing to free up resources
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status && 'didJustFinish' in status && status.didJustFinish) {
        await sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log('Error playing background sound', error);
  }
}