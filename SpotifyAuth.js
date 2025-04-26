import React from 'react';
import { WebView } from 'react-native-webview';
import { Linking, StyleSheet } from 'react-native';
import Constants from 'expo-constants';


const state = Math.random().toString(36).substring(2, 15);


const clientId = 'faa0134745184b2094651b9c44c1f67e'; // Replace with your actual client ID
const redirectUri = 'myapp://callback';
const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&state=${state}&show_dialog=true&scope=user-read-private%20user-read-email%20user-read-currently-playing%20user-read-playback-state`;


export const SpotifyAuth = ({ onCode }) => {

  const handleNavigationStateChange = (navState) => {
    const url = navState.url;
    console.log("WebView URL:", url);
    if (url.startsWith(redirectUri)) {
      try {
        const urlParams = new URL(url);
        const code = urlParams.searchParams.get('code');
        if (code) {
          onCode(code);
        } else {
          console.error('No code parameter found');
        }
      } catch (error) {
        console.error('Error parsing URL:', error);
      }
    }
  };

  const handleMessage = (event) => {
    const message = event.nativeEvent.data
    console.log("WebView message:", message);

    if(message === "navigateBack"){
        console.warn("they are communicating")
        navigation.navigate("Login")
    }
}

  return (
    <WebView
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      style={styles.container}
      source={{ uri: authUrl }}
      onNavigationStateChange={handleNavigationStateChange}
      onMessage={handleMessage}
      webviewDebuggingEnabled={true}
      injectedJavaScript={`
        (function() {
          const originalConsoleLog = console.log;
          console.log = function(...args) {
            originalConsoleLog.apply(console, args);
            window.ReactNativeWebView.postMessage('LOG:' + JSON.stringify(args));
          };
          
          console.error = function(...args) {
            window.ReactNativeWebView.postMessage('ERROR:' + JSON.stringify(args));
          };
          
          // Monitor button clicks to see if they're triggering
          document.addEventListener('click', function(e) {
            window.ReactNativeWebView.postMessage('CLICK:' + e.target.tagName + ',' + e.target.className);
          }, true);
          
          // Monitor form submissions
          document.addEventListener('submit', function(e) {
            window.ReactNativeWebView.postMessage('FORM_SUBMIT');
          }, true);
          
          true;
        })();
      `}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
    backgroundColor: '#FF0000',
    width: 320,
  },
});

export default SpotifyAuth;