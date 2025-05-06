import { Track } from "@spotify/web-api-ts-sdk"
import { memo } from "react"
import { StyleSheet, View } from "react-native"
import { Card, Text } from "react-native-paper";

interface SongCardProps {
    song: Track
}

export const SongCard = memo((props: SongCardProps) => {
    const track = props.song;
    return (
        <Card key={track.id} style={styles.queueCard}>
          <Card.Content style={styles.queueCardContent}>
            <Card.Cover 
              source={{ uri: track.album.images[0]?.url }} 
              style={styles.queueCover}
            />
            <View style={styles.queueTrackInfo}>
              <Text style={styles.queueTrackName} numberOfLines={1}>
                {track?.name || 'Unknown track'}
              </Text>
              <Text style={styles.queueArtist} numberOfLines={1}>
                {track?.artists?.map(artist => artist.name).join(', ') || 'Unknown artist'}
              </Text>
            </View>
          </Card.Content>
        </Card>
    );
});

const styles = StyleSheet.create({
    queueCard: {
        marginBottom: 10,
        height: 80,
      },
      queueCardContent: {
        flexDirection: 'row',
        padding: 0,
        height: '100%',
      },
      queueCover: {
        width: 80,
        height: '100%',
        borderRadius: 0,
      },
      queueTrackInfo: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
      },
      queueTrackName: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
      },
      queueArtist: {
        fontSize: 14,
        color: '#666',
      },
})