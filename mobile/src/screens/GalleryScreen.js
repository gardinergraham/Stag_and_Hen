import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing } from '../theme';
import { Button } from '../components';
import { mediaApi } from '../services/api';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');
const imageSize = (width - spacing.lg * 2 - spacing.sm * 2) / 3;

const GalleryScreen = () => {
  const { session, isOwner } = useApp();
  const [media, setMedia] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadMedia = async () => {
    try {
      const response = await mediaApi.getByEvent(session.event_id);
      setMedia(response.data);
    } catch (error) {
      console.error('Failed to load media:', error);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMedia();
    setRefreshing(false);
  }, []);

  const handleUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        // In a real app, you would upload to cloud storage first
        // For now, we'll use the local URI as a placeholder
        const asset = result.assets[0];
        await mediaApi.upload({
          event_id: session.event_id,
          uploaded_by: session.member_name,
          file_url: asset.uri,
          media_type: asset.type === 'video' ? 'video' : 'image',
        });
        await loadMedia();
        Alert.alert('Success', 'Media uploaded!');
      } catch (error) {
        Alert.alert('Error', 'Failed to upload media');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = (mediaItem) => {
    const canDelete = mediaItem.uploaded_by === session.member_name || isOwner;
    if (!canDelete) {
      Alert.alert('Cannot Delete', 'You can only delete your own uploads.');
      return;
    }

    Alert.alert('Delete Media', 'Are you sure you want to delete this?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await mediaApi.delete(mediaItem.id, session.member_name);
            await loadMedia();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete media');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.mediaItem}
      onLongPress={() => handleDelete(item)}
    >
      <Image
        source={{ uri: item.file_url || item.thumbnail_url }}
        style={styles.mediaImage}
        resizeMode="cover"
      />
      {item.media_type === 'video' && (
        <View style={styles.videoOverlay}>
          <Text style={styles.videoIcon}>▶️</Text>
        </View>
      )}
      <View style={styles.mediaInfo}>
        <Text style={styles.uploadedBy}>{item.uploaded_by}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gallery</Text>
        <Text style={styles.subtitle}>{media.length} memories captured</Text>
      </View>

      <FlatList
        data={media}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyTitle}>No memories yet!</Text>
            <Text style={styles.emptyText}>
              Start capturing moments from your party
            </Text>
          </View>
        }
      />

      <View style={styles.uploadSection}>
        <Button
          title={uploading ? 'Uploading...' : 'Upload Photo/Video'}
          variant="primary"
          size="large"
          onPress={handleUpload}
          loading={uploading}
          disabled={uploading}
        />
        <Text style={styles.hint}>Long press on a photo to delete</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  grid: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  mediaItem: {
    width: imageSize,
    height: imageSize,
    margin: spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    fontSize: 24,
  },
  mediaInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4,
  },
  uploadedBy: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  uploadSection: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default GalleryScreen;
