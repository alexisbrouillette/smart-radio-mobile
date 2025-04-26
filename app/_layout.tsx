import React, { useEffect, useState } from 'react';
import { Text, Button, SafeAreaView  } from 'react-native';
import SpotifyAuth from '../SpotifyAuth';
import * as Linking from 'expo-linking';
import { Audio } from 'expo-av';
import { 
  exchangeCodeForToken, 
  fetchPlaybackState, 
  fetchUserQueue, 
  generate_queue_audio, 
  generate_queue_texts
} from './network/network';
import { checkPermission } from './task/task';
// import * as TaskManager from 'expo-task-manager';
// import * as BackgroundFetch from 'expo-background-fetch';
import ReactNativeForegroundService from "@supersami/rn-foreground-service";
import { Track } from '@spotify/web-api-ts-sdk';

global.Buffer = require('buffer').Buffer;

export interface RadioItem {
  text: string;
  beforeTrackId: string;
  audio: string | null;
}


let registered = false;
let currentSong: Track | null = null;
let queue: Track[] = [];
let radioItems: RadioItem[] = [];

console.log("Registered:", registered);
if (ReactNativeForegroundService && !registered) {
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

const simplifyTrack = (track: Track) => {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist) => artist.name).join(', '),
    album: track.album.name,
    duration: track.duration_ms,
  };
}
// Sound playing function
async function playBackgroundSound() {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/glass-break-316720.mp3'),
      {
        isLooping: false,
        isMuted: false,
        volume: 1.0,
        rate: 1.0,
        shouldPlay: true,
      }
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

// Sound playing function
async function playBase64Audio(base64Audio: string) {
  console.log("Playing base64 audio");
  try {
    const soundObject = new Audio.Sound();
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    await soundObject.loadAsync({ uri: `data:audio/wav;base64,${audioBuffer.toString('base64')}` });
    await soundObject.playAsync();

    // Unload the sound after playing to free up resources
    soundObject.setOnPlaybackStatusUpdate(async (status) => {
      if (status && 'didJustFinish' in status && status.didJustFinish) {
        await soundObject.unloadAsync();
      }
    });
  } catch (error) {
    console.log('Error playing base64 audio', error);
  }
}

async function updateSongStatus(accessToken: string) {
  try {
    
    const playbackState = await fetchPlaybackState(accessToken);
    if (!playbackState) {
      console.error('No playback state found');
      return;
    }

    if(playbackState.name !== currentSong?.name) {
      //the song just changed!!
      fetchAudioTexts();
      //forcing the array to be unique
      const newQueue = [...queue];
      const first_queue = newQueue.shift();
      queue = newQueue;
      currentSong = playbackState;
      console.log("First queue:", {id: first_queue?.id, name: first_queue?.name});
      console.log("Current song:", {id: currentSong?.id, name: currentSong?.name});

      console.log("Last radio item", radioItems[radioItems.length - 1].beforeTrackId);
      if(currentSong && currentSong.id == radioItems[radioItems.length - 1].beforeTrackId) {
        console.log("Playing radio item");
        const radioItem = radioItems[radioItems.length - 1];
        if (radioItem.audio) {
          console.log("Playing audio");
          await playBase64Audio(radioItem.audio);
          radioItems.shift();
        } else {
          console.error("No audio found for the current radio item");
        }
      }
    }
  }
  catch (error) {
    console.error('Error updating song status:', error);
  }
}


const fetchAudioTexts = async () => {
  let newRadioText: RadioItem = {
    text: "",
    beforeTrackId: "",
    audio: null,
  };

  if(radioItems.length === 0) {
    newRadioText = await generate_queue_texts([queue[0], queue[1]]);
    newRadioText.beforeTrackId = queue[1].id;
    newRadioText
    console.log("First radio item:", {beforeTrackId: newRadioText.beforeTrackId});
  }
  else{
    console.log(radioItems[radioItems.length - 1].beforeTrackId);
    console.log(queue.map((track) => track.id));
    const nextTrackToFetchRadio = queue.findIndex((track) => track.id == radioItems[radioItems.length - 1].beforeTrackId);
    console.log("Next Track to fetch radio:", nextTrackToFetchRadio);
    if(nextTrackToFetchRadio != queue.length -1){
        
       
      //we already generated audio for the beforeTrack so we need to add 1 to the index
      if (nextTrackToFetchRadio > -1 && nextTrackToFetchRadio < queue.length-1) {
        const newFetchingRadioFor = [queue[nextTrackToFetchRadio+1]];
        //usually give 2 tracks per request but if it's the last track, only give 1
        if(nextTrackToFetchRadio < queue.length - 2) {
          newFetchingRadioFor.push(queue[nextTrackToFetchRadio + 2]);
        }
        newRadioText = await generate_queue_texts(newFetchingRadioFor);
      }
    }
  }
  console.log("Radio Items:", radioItems.length);
  radioItems.push(newRadioText);

  fetchAudio();
}

const fetchAudio = async () => {
  console.log("Fetching audio for radio items");
  const emptyAudioItem = radioItems.find(item => item.audio === 'empty');
  if (emptyAudioItem) {
    console.log("Found item with empty audio:", emptyAudioItem.beforeTrackId);
    const newAudio = await generate_queue_audio(emptyAudioItem.text);
    const radioItemToUpdateIndex = radioItems.findIndex((radioItem) => radioItem.beforeTrackId == emptyAudioItem.beforeTrackId);
    radioItems[radioItemToUpdateIndex].audio = newAudio;
    console.log("Got new audio")
  } 
};

export default function RootLayout() {
  const [code, setCode] = useState<string | null>(null);


  // Handle Spotify authentication callback
  const handleCode = async (code: string): Promise<void> => {
    console.log("Code received:", code);
    try {
      const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code);
      console.log("Access Token:", accessToken);
      setCode(accessToken);
      queue = await fetchUserQueue(accessToken);
      console.log("User Queue:", queue[0]);
      console.log("User Queue:", queue[1]);
      // const playbackState = await fetchPlaybackState(accessToken);
      // console.log("Playback State:", playbackState);
      await initService(accessToken);
      // TODO: Implement secure token storage
      // Store tokens securely for background fetch
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  // URL handling for authentication
  const handleOpenURL = (event: { url: string }) => {
    const { url } = event;
    if (url.startsWith('myapp://callback')) {
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get('code');
      
      if (code) {
        handleCode(code);
      } else {
        console.error('No code found in URL');
      }
    }
  };
  
  const initService = async (code:string) => {
    console.log("Init service:",  code);
    await checkPermission();
    await startTask();
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
      ReactNativeForegroundService.add_task(() => updateSongStatus(code), {
        delay: 1000,
        onLoop: true,
        taskId: 'taskId',
        onError: (e) => console.log(`Error logging:`, e),
      });
    } else {
      console.error("ReactNativeForegroundService is null");
    }
  }

  // Set up URL listener and background fetch
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleOpenURL);  
    return () => {
      subscription.remove();
      
    };
  }, []);

  const startTask = () => {
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
  const loopFetchSong = async (code: string) => {
    // setInterval(async () => {
    //     // Fetch current playback state
    //     const playbackState = await fetchPlaybackState(code);
    //     // In component
    //     const lastTrackId = await AsyncStorage.getItem('lastTrackId');

    //     // Check if a new track is playing
    //     if (playbackState && playbackState.id !== lastTrackId) {
    //       // Play sound between tracks
    //       await playBackgroundSound();
          
    //       await AsyncStorage.setItem('lastTrackId', playbackState.id);
    //     }
    // }
    // , 1000);
  };

  // Toggle background fetch when code changes
  useEffect(() => {
    if (code) {
      loopFetchSong(code);
    }
  }, [code]);

  const btnPress = async () => {
    console.log("btnPress");
    console.log('Background task triggered manually');
    console.log(ReactNativeForegroundService.get_all_tasks());
    ReactNativeForegroundService.remove_all_tasks();
    //const t = await TaskManager.getRegisteredTasksAsync();
    //await TaskManager.unregisterAllTasksAsync();
    //console.log("Registered tasks:", t);
    //playBackgroundSound();
    // if (code) {
    //   await fetchUserQueue(code);
    // }
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Fetch User Queue" onPress={btnPress} />
      {/* {code ? (
        <Text>Authenticated with Spotify</Text>
      ) : (
        <SpotifyAuth onCode={handleCode} />
      )} */}
      <SpotifyAuth onCode={handleCode} />
    </SafeAreaView>
  );
}

