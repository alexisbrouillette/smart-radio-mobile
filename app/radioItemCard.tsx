import RadioItem from "./types";
import { Card, Text } from "react-native-paper";
import { StyleSheet, View } from "react-native";

export const RadioItemCard = ({ radioItem }: { radioItem: RadioItem }) => {
    return (
        <Card key={radioItem.beforeTrackId} style={styles.queueCard}>
            <Card.Content style={styles.queueCardContent}>
                <View style={styles.queueTrackInfo}>
                    <Text style={styles.queueTrackName} numberOfLines={1}>
                        {radioItem.text || 'Unknown item'}
                    </Text>
                </View>
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    queueCard: {
        marginBottom: 10,
        height: 80,
        backgroundColor: 'purple',
      },
      queueCardContent: {
        flexDirection: 'row',
        padding: 0,
        height: '100%',
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
});