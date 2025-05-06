import React, { useEffect, useState } from 'react';
//import { Text, Button, SafeAreaView  } from 'react-native';
import SpotifyAuth from '../SpotifyAuth';
import * as Linking from 'expo-linking';
import { 
  exchangeCodeForToken
} from './network/network';
import ReactNativeForegroundService from "@supersami/rn-foreground-service";
import { Track } from '@spotify/web-api-ts-sdk';
import initService from './foregroundService';
import { ScrollView, StyleSheet, DeviceEventEmitter, View, Dimensions } from 'react-native';

import { Avatar, Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SongCard } from './songCard';
import RadioItem from './types';
import { RadioItemCard } from './radioItemCard';


global.Buffer = require('buffer').Buffer;

const { height } = Dimensions.get('window');
const NOW_PLAYING_HEIGHT = height * 0.66; // 2/3 of screen height




let registered = false;


console.log("Registered:", registered);
if (ReactNativeForegroundService && !registered) {
  console.log("Registering foreground service");
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


export default function RootLayout() {
  const [code, setCode] = useState<string | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentSong, setCurrentSong] = useState<Track | null>(null);
  const [radioItems, setRadioItems] = useState<RadioItem[]>([]);

    // Set up URL listener and background fetch
    useEffect(() => {
      console.log("Setting up URL listener");
      const subscription = Linking.addEventListener('url', handleOpenURL);

      const subscriptionEvent = DeviceEventEmitter.addListener('updatedQueue', (data) => {
        console.log('Received data from service:');
        // Update your UI here
        setQueue(data.queue);
      });

      const currentSongEvent = DeviceEventEmitter.addListener('currentSong', (data) => {
        console.log('Received current song data:');
        // Handle current song data here
        setCurrentSong(data.currentSong);
      });
      const radioItemsEvent = DeviceEventEmitter.addListener('updatedRadioItems', (data) => {
        setRadioItems(data.radioItems);
      });

      return () => {
        subscription.remove();
        subscriptionEvent.remove();
        currentSongEvent.remove();
        radioItemsEvent.remove();
      };
    }, []);


  // Handle Spotify authentication callback
  const handleCode = async (code: string): Promise<void> => {
    console.log("Code received:", code);
    try {
      const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code);
      console.log("Access Token:", accessToken);
      setCode(accessToken);

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

  const renderNowPlaying = (currentSong: Track) => (
    <View style={styles.nowPlayingContainer}>
      <Card style={styles.nowPlayingCard}>
        <Card.Cover 
          source={{ uri: currentSong.album.images[0]?.url }} 
          style={styles.nowPlayingCover}
        />
        <Card.Content style={styles.nowPlayingContent}>
          <Text style={styles.nowPlayingTitle}>{currentSong?.name || 'No track playing'}</Text>
          <Text style={styles.nowPlayingArtist}>
            {currentSong?.artists?.map(artist => artist.name).join(', ') || 'Unknown artist'}
          </Text>
          <Text style={styles.nowPlayingAlbum}>{currentSong?.album?.name || 'Unknown album'}</Text>
        </Card.Content>
      </Card>
    </View>
  );

  const renderQueue = () => {
    if (queue.length > 0) {
      const renderList: (RadioItem | Track)[] = [...queue];
      for (let i = 0; i < radioItems.length; i++) {
        const radioItem = radioItems[i];
        const index = renderList.findIndex((item) => 'name' in item && item.id === radioItem.beforeTrackId);
        renderList.splice(index, 0, radioItem);

      }
      return renderList.map((elem) => {
        if ('album' in elem)
          return <SongCard song={elem} key={elem.id} />;
        else
          return <RadioItemCard radioItem={elem} key={elem.beforeTrackId+"radio"} />;
      });
    }
    return null;
  }
  
 
  return (
    <SafeAreaView style={styles.container}>
      <Button onPress={btnPress} style={styles.button}>
        Fetch User Queue
      </Button>
      
      {queue.length > 0 && currentSong? (
        <ScrollView style={styles.queueContainer}>
          {renderNowPlaying(currentSong)} 
          {renderQueue()}
        </ScrollView>
      ) : (
        <SpotifyAuth onCode={handleCode} />
      )}
    </SafeAreaView>
  );
  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nowPlayingContainer: {
    height: NOW_PLAYING_HEIGHT,
  },
  nowPlayingCard: {
    height: '100%',
    borderRadius: 0,
  },
  nowPlayingCover: {
    height: '70%',
    width: '100%',
    borderRadius: 0,
  },
  nowPlayingContent: {
    padding: 20,
    alignItems: 'center',
  },
  nowPlayingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  nowPlayingArtist: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  nowPlayingAlbum: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  queueContainer: {
    flex: 1,
    padding: 10,
  },
  
  button: {
    margin: 10,
  },
});