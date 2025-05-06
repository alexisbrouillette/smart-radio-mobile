import { Track } from "@spotify/web-api-ts-sdk";
import { fetchPlaybackState, fetchUserQueue, generate_queue_audio, generate_queue_texts } from "./network/network";
import RadioItem from "./types";
import { checkPermission, createTask } from "./task/task";
import ReactNativeForegroundService from "@supersami/rn-foreground-service";
import { Audio } from 'expo-av';
import { DeviceEventEmitter } from 'react-native';


let currentSong: Track | null = null;
let queue: Track[] = [];
let radioItems: RadioItem[] = [];


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


const fetchAudioTexts = async () => {
    let newRadioText: RadioItem = {
        text: "",
        beforeTrackId: "",
        audio: null,
    };

    if (radioItems.length === 0) {
        newRadioText = await generate_queue_texts([queue[0], queue[1]]);
        newRadioText.beforeTrackId = queue[1].id;
        console.log("First radio item:", { beforeTrackId: newRadioText.beforeTrackId });
    }
    else {
        console.log(radioItems[radioItems.length - 1].beforeTrackId);
        console.log(queue.map((track) => track.id));
        const nextTrackToFetchRadio = queue.findIndex((track) => track.id == radioItems[radioItems.length - 1].beforeTrackId);
        console.log("Next Track to fetch radio:", nextTrackToFetchRadio);
        if (nextTrackToFetchRadio != queue.length - 1) {


            //we already generated audio for the beforeTrack so we need to add 1 to the index
            if (nextTrackToFetchRadio > -1 && nextTrackToFetchRadio < queue.length - 1) {
                const newFetchingRadioFor = [queue[nextTrackToFetchRadio + 1]];
                //usually give 2 tracks per request but if it's the last track, only give 1
                if (nextTrackToFetchRadio < queue.length - 2) {
                    newFetchingRadioFor.push(queue[nextTrackToFetchRadio + 2]);
                }
                newRadioText = await generate_queue_texts(newFetchingRadioFor);
            }
        }
    }
    console.log("Radio Items:", radioItems.length);
    radioItems.push(newRadioText);
    DeviceEventEmitter.emit('updatedRadioItems', { radioItems });
    fetchAudio();
}


const initService = async (code: string) => {
    await createTask();
    console.log("Init service:", code);
    queue = await fetchUserQueue(code);
    currentSong = await fetchPlaybackState(code);
    fetchAudioTexts();
    // To send events from service to frontend
    DeviceEventEmitter.emit('updatedQueue', { queue });
    DeviceEventEmitter.emit('currentSong', { currentSong });

    console.log("Queue:", queue.length);
    await checkPermission();
    //await startTask();
    console.log("Awaited startTask");
    console.log(ReactNativeForegroundService.get_task('taskId'))
    console.log("Is running: ", ReactNativeForegroundService.is_task_running('taskId'));
    if (ReactNativeForegroundService) {
        if (ReactNativeForegroundService.is_task_running('taskId') != null) {
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

async function updateSongStatus(accessToken: string) {
    try {
        const playbackState = await fetchPlaybackState(accessToken);
        if (!playbackState) {
            console.error('No playback state found');
            return;
        }
        if (playbackState.name !== currentSong?.name) {
            //the song just changed!!
            fetchAudioTexts();
            //forcing the array to be unique
            const newQueue = [...queue];
            const first_queue = newQueue.shift();
            queue = newQueue;
            currentSong = playbackState;

            DeviceEventEmitter.emit('updatedQueue', { queue });
            DeviceEventEmitter.emit('currentSong', { currentSong });
            console.log("First queue:", { id: first_queue?.id, name: first_queue?.name });
            console.log("Current song:", { id: currentSong?.id, name: currentSong?.name });

            console.log("Last radio item", radioItems[0].beforeTrackId);
            if (currentSong && currentSong.id == radioItems[0].beforeTrackId) {
                console.log("Playing radio item");
                const radioItem = radioItems[0];
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

// // Sound playing function
// async function playBackgroundSound() {
//   try {
//     const { sound } = await Audio.Sound.createAsync(
//       require('../assets/glass-break-316720.mp3'),
//       {
//         isLooping: false,
//         isMuted: false,
//         volume: 1.0,
//         rate: 1.0,
//         shouldPlay: true,
//       }
//     );
//     await sound.playAsync();

//     // Unload the sound after playing to free up resources
//     sound.setOnPlaybackStatusUpdate(async (status) => {
//       if (status && 'didJustFinish' in status && status.didJustFinish) {
//         await sound.unloadAsync();
//       }
//     });
//   } catch (error) {
//     console.log('Error playing background sound', error);
//   }
// }

export default initService;