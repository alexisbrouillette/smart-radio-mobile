import { Track } from "@spotify/web-api-ts-sdk";
import RNFetchBlob from 'react-native-blob-util';

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  // Add other fields as needed based on the Spotify API response
}

export const getUserProfile = async (accessToken: string): Promise<UserProfile> => {
  const response: Response = await fetch('https://api.spotify.com/v1/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data: UserProfile = await response.json();
  return data;
};

export const exchangeCodeForToken = async (code: string) => {
    try{
    const clientId = 'faa0134745184b2094651b9c44c1f67e';
    const clientSecret = '03be1bd5caa04defa182786bc4a40918';
    const redirectUri = 'myapp://callback';
    // Prepare the request body
    const tokenRequestBody = `client_id=${clientId}&client_secret=${clientSecret}&grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    // Prepare the headers
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      //'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    };
    // Make the token exchange request
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: headers,
      body: tokenRequestBody
    });

    // Check if the response is successful
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    // Parse the response
    const tokenData = await response.json();

    // Return the access token and refresh token
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    };

  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};

// interface Track {
//   id: string;
//   name: string;
//   album: {
//     name: string;
//     release_date: string;
//   };
//   artists: { name: string }[];
// }

const simplifyQueue = (rawQueue: Track[]) => {
  const queue: any[] = [];
  rawQueue.forEach((item, i) => {
    queue.push({
      "name": item.name,
      "release_year": item.album.release_date.split("-")[0],
      "album": item.album.name,
      "artists": item.artists.map(obj => obj.name).join(", "),
      "id": item.id
    });
  });
  return queue;
}

export const fetchUserQueue = async (accessToken: string): Promise<Track[]> => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/queue', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Queue Fetch Error:', errorData);
        throw new Error('Failed to fetch queue');
      }
  
      const queueData = await response.json();
  
      if (queueData.queue.length === 0) {
        throw new Error('Queue is empty');
      }

      // removes duplicates
      const uniqueTracks = queueData.queue.filter((track: Track, index: number, self: Track[]) =>
        index === self.findIndex((t) => t.id === track.id)
      );
      
      return uniqueTracks;
    } catch (error) {
      console.error('Error fetching Spotify queue:', error);
      throw error;
    }
};

export const fetchPlaybackState = async (accessToken: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Queue Fetch Error:', errorData);
        throw new Error('Failed to fetch queue');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch playback state');
      }

      const data = await response.json();

      // Check if a track is currently playing
      if (data.item) 
        return data.item;
      return null; // No track is currently playing
    } catch (error) {
      console.error('Error fetching playback state:', error);
    }
  };


//**********************My backend****************************** */
export async function generate_queue_texts(queue: Track[]) {
  // try {
  //   const server = 'https://wondrous-humbly-bat.ngrok-free.app'
  //   console.log(`${server}/get_radio_text`);
  //   const response = await fetch(`${server}/get_radio_text`, {
  //     method: 'POST',
  //     mode: 'cors',
  //     cache: 'no-cache',
  //     headers: {
  //       'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify(simplifyQueue(queue)),
  //   });
  //   //const body = response.body?.getReader();
  //   const body = await response.json();
  //   console.log("BODY", body);
  //   if (body !== undefined) {
  //     return body;
  //     //await readWAV(body);
  //   }
    
  // } catch (error) {
  //   console.error('Error:', error);
  // }
  console.log("Inserting before track id", queue.map((item) => item.id).join(", "));
  return {
    audio: "empty", 
    beforeTrackId: queue[0].id, 
    text: "On a écouté \"Waterloo Sunset\" des Kinks, un classique de 1967.  Maintenant,  on remonte le temps jusqu'en 1970 avec Paul McCartney et son \"Maybe I'm Amazed\" (version remasterisée 2011), tirée de l'album *McCartney (Archive Collection)*.  Écrite pendant la séparation des Beatles et son mariage avec Linda, cette chanson reflète l'intensité émotionnelle de cette période.  Un hymne à l'amour au milieu du chaos de la fin des Fab Four!  Écoutons ça !"
  }
}

const concatUint8Arrays = (a: Uint8Array, b: Uint8Array) => {
  console.log("CONCATENATING UINT8ARRAYS")
  const res = new Uint8Array(a.length + b.length);
  res.set(a);
  res.set(b, a.length);
  return res;
}
const readWAV = async (stream: ReadableStreamDefaultReader<Uint8Array>) => {
  console.log("READING WAV")
  let read_stream = await stream.read();
  let wav: Uint8Array = new Uint8Array();

  while (read_stream && read_stream.done === false) {
    wav = concatUint8Arrays(wav, read_stream.value);
    read_stream = await stream.read();
  }

  const b64_wav = Buffer.from(wav).toString('base64');
  return b64_wav;
  //const audio = new Audio(`data:audio/wav;base64,${b64_wav}`);
  //await audio.play();
}
export async function generate_queue_audio(text: string): Promise<string | null> {
  const server = 'https://wondrous-humbly-bat.ngrok-free.app';
  try {
    const response = await RNFetchBlob.fetch(
      'POST',
      `${server}/get_radio_audio`,
      {
        'Content-Type': 'application/json',
      },
      JSON.stringify(text),
    );

    // Get base64 data (works universally)
    const base64Data = await response.base64();
    return base64Data;
    // // Convert to ArrayBuffer
    // const arrayBuffer = Buffer.from(base64Data, 'base64').buffer;
    // const uint8Array = new Uint8Array(arrayBuffer);

    // // Create a proper ReadableStream for `readWAV`
    // const fakeStream = new ReadableStream<Uint8Array>({
    //   start(controller) {
    //     controller.enqueue(uint8Array);
    //     controller.close();
    //   },
    // });

    // return await readWAV(fakeStream.getReader());
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}
// export async function generate_queue_audio(text: string): Promise<string | null> {
//   //console.log("GENERATING AUDIO")
//   const server = 'https://wondrous-humbly-bat.ngrok-free.app'
//   try {
//     const response = await fetch(`${server}/get_radio_audio`, {
//       method: 'POST',
//       mode: 'cors',
//       cache: 'no-cache',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(text)
//     });
//     //const body = response.body?.getReader();
//     const audioBlob = await response.blob();
//     //const body = await response.json();

//     console.log("BODY", audioBlob);
//     if (audioBlob !== undefined) {
//       const arrayBuffer = await audioBlob.arrayBuffer();
//       //  const readableStream = (await body).stream();
//       //  const reader = readableStream.getReader();
//           // Convert to Uint8Array (if `readWAV` expects a stream-like input)
//       const uint8Array = new Uint8Array(arrayBuffer);

//       // If `readWAV` expects a stream, simulate one (React Native workaround)
//       const fakeStream = {
//         read: async () => {
//           return { done: true, value: uint8Array };
//         },
//       };
//        return await readWAV(fakeStream as any);
//     }
//     return null;
    
//   } catch (error) {
//     console.error('Error:', error);
//     return null;
//   }
// }

// Add a default export to satisfy the requirement
export default {
  exchangeCodeForToken,
  fetchPlaybackState,
  fetchUserQueue,
};





