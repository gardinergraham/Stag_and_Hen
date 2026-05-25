// src/screens/GalleryScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Dimensions,
  RefreshControl,
  Modal,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Video, ResizeMode } from 'expo-av';
import ViewShot from 'react-native-view-shot';

import api from '../services/api';
import { useApp } from '../context/AppContext';
import { getEventMediaWindows } from '../utils/eventDates';

const { width, height } = Dimensions.get('window');

const colourFilters = [
  { name: 'original', label: 'Original', style: {} },
  { name: 'soft', label: 'Soft', style: { opacity: 0.9 } },
  { name: 'bright', label: 'Bright', style: { opacity: 1 } },
  { name: 'moody', label: 'Moody', style: { opacity: 0.72 } },
  { name: 'party', label: 'Party', style: { borderColor: '#e94560', borderWidth: 4 } },
];

const previewMedia = [
  {
    id: 'preview-photo-1',
    media_type: 'image',
    file_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900',
    thumbnail_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400',
    uploaded_by: 'Maid of Honour',
  },
  {
    id: 'preview-photo-2',
    media_type: 'image',
    file_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900',
    thumbnail_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
    uploaded_by: 'Best Mate',
  },
  {
    id: 'preview-photo-3',
    media_type: 'image',
    file_url: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=900',
    thumbnail_url: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=400',
    uploaded_by: 'The Crew',
  },
];

export default function GalleryScreen(props) {
  const insets = useSafeAreaInsets();
  const { session, isOwner } = useApp();
  const isPreview = session?.is_preview;

  const resolvedEventId =
    props.eventId ?? props.route?.params?.eventId ?? session?.event_id ?? undefined;

  const onBack = props.onBack;
  const headerTitle = props.headerTitle ?? 'Gallery';

  const [media, setMedia] = useState([]);
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('original');
  const [imageSizes, setImageSizes] = useState({});

  // placeholder for later paid access logic
  const [hasPaidAccess] = useState(true);

  const scrollRef = useRef(null);
  const viewShotRef = useRef(null);
  const videoRefs = useRef([]);

  const loadMedia = useCallback(async () => {
    if (isPreview) {
      setMedia(previewMedia);
      setEventDetails({
        event_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        event_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        event_tier: 'prime',
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!resolvedEventId) return;

    try {
      setLoading(true);
      const [mediaResponse, eventResponse] = await Promise.all([
        api.get(`/media/event/${resolvedEventId}`),
        api.get(`/events/${resolvedEventId}`),
      ]);
      setMedia(Array.isArray(mediaResponse.data) ? mediaResponse.data : []);
      setEventDetails(eventResponse.data);
    } catch (err) {
      console.error('Failed to load media:', err);
      Alert.alert('Error', 'Failed to load gallery.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolvedEventId, isPreview]);

  useEffect(() => {
    if (!resolvedEventId) {
      setLoading(false);
      return;
    }
    loadMedia();
  }, [resolvedEventId, loadMedia]);

  useEffect(() => {
    media.forEach((item, idx) => {
      const ref = videoRefs.current[idx];
      if (item.media_type === 'video' && ref) {
        if (idx === selectedIndex && fullScreenVisible) {
          ref.playAsync?.().catch(() => {});
        } else {
          ref.pauseAsync?.().catch(() => {});
        }
      }
    });
  }, [selectedIndex, fullScreenVisible, media]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedia();
  };

  const mediaWindows = getEventMediaWindows({
    event_date: eventDetails?.event_date || session?.event_date,
    event_end_date: eventDetails?.event_end_date || session?.event_end_date,
    event_tier: eventDetails?.event_tier || session?.event_tier,
  });

  const ensureUploadsOpen = () => {
    if (isOwner) return true;
    if (mediaWindows.uploadsOpen) return true;

    Alert.alert('Uploads Closed', mediaWindows.uploadStatus);
    return false;
  };

  const ensureDownloadsOpen = () => {
    if (isOwner) return true;
    if (mediaWindows.downloadsOpen) return true;

    Alert.alert('Downloads Locked', mediaWindows.downloadStatus);
    return false;
  };

  const uploadMedia = async (asset) => {
    if (isPreview) {
      Alert.alert('Preview Mode', 'Create an event to add your own photos and videos.');
      return;
    }

    if (!resolvedEventId) return;
    if (!ensureUploadsOpen()) return;

    setUploading(true);
    try {
      const fileName =
        asset.fileName ||
        asset.uri.split('/').pop() ||
        `upload-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;

      const mimeType =
        asset.mimeType ||
        (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      });

      const uploadUrl = `${api.defaults.baseURL}/media/upload-file`;
      console.log('Uploading to:', uploadUrl);
      console.log('Asset:', asset);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const uploadText = await uploadResponse.text();
      console.log('Upload raw response:', uploadText);

      let uploadData;
      try {
        uploadData = JSON.parse(uploadText);
      } catch (e) {
        throw new Error(`Upload returned non-JSON response: ${uploadText}`);
      }

      if (!uploadResponse.ok) {
        throw new Error(uploadData.detail || 'Upload failed');
      }

      await api.post('/media/', {
        event_id: resolvedEventId,
        uploaded_by: session?.member_name,
        file_url: uploadData.file_url,
        media_type: asset.type === 'video' ? 'video' : 'image',
        caption: '',
        thumbnail_url: null,
      });

      await loadMedia();
      Alert.alert('Success', 'Media uploaded!');
    } catch (error) {
      console.error('Upload error full:', error);
      Alert.alert('Upload Failed', error.message || 'Could not upload media.');
    } finally {
      setUploading(false);
    }
  };

  const pickMedia = async () => {
  try {
    if (!ensureUploadsOpen()) return;
    console.log('pickMedia pressed');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });

    console.log('picker result:', result);

    if (!result.canceled && result.assets && result.assets[0]) {
      await uploadMedia(result.assets[0]);
    }
  } catch (error) {
    console.error('Image picker error:', error);
    Alert.alert('Error', 'Could not open your photo library.');
  }
};

  const takeMedia = async () => {
    if (!ensureUploadsOpen()) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadMedia(result.assets[0]);
    }
  };

  const deleteMedia = async (mediaId) => {
    try {
      setUploading(true);
      await api.delete(`/media/${mediaId}`, {
        params: { member_name: session?.member_name },
      });
      setFullScreenVisible(false);
      await loadMedia();
      Alert.alert('Deleted', 'Media deleted successfully.');
    } catch (error) {
      console.error('Delete error:', error?.response?.data || error.message);
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to delete media.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (mediaId) => {
    Alert.alert('Delete Media', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMedia(mediaId) },
    ]);
  };

  const handleShareMedia = async () => {
    const currentMedia = media[selectedIndex];
    if (!currentMedia) return;

    if (isPreview) {
      Alert.alert('Preview Mode', 'Create an event to share real gallery media.');
      return;
    }

    try {
      await Share.share({
        title: `${session?.event_name || 'The Stag & Hen'} memory`,
        message: `A memory from ${session?.event_name || 'The Stag & Hen'}: ${currentMedia.file_url}`,
        url: currentMedia.file_url,
      });
    } catch (error) {
      console.error('Share media failed:', error);
      Alert.alert('Share Failed', 'Could not share this media.');
    }
  };

  const handleSaveMedia = async () => {
    const currentMedia = media[selectedIndex];
    if (!currentMedia) return;

    if (isPreview) {
      Alert.alert('Preview Mode', 'Create an event to save real gallery media.');
      return;
    }

    if (!ensureDownloadsOpen()) return;

    if (currentMedia.media_type !== 'image') {
      Alert.alert('Coming Soon', 'Video downloads will be part of the full gallery export.');
      return;
    }

    try {
      const currentPermission = await MediaLibrary.getPermissionsAsync(true);
      if (!currentPermission.granted && currentPermission.accessPrivileges === 'none') {
        await MediaLibrary.requestPermissionsAsync(true);
      }

      const uri = await viewShotRef.current?.capture();
      if (!uri) {
        Alert.alert('Save Failed', 'Could not capture this image.');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'This photo has been saved to your library.');
    } catch (error) {
      console.error('Save media failed:', error);
      Alert.alert(
        'Permission Needed',
        'Please allow Stag & Hen to add photos to your library, then try saving again.'
      );
    }
  };

  const handleSaveFilteredToGallery = async () => {
    const currentMedia = media[selectedIndex];
    if (!currentMedia) return;

    if (isPreview) {
      Alert.alert('Preview Mode', 'Create an event to save edited photos to the gallery.');
      return;
    }

    if (currentMedia.media_type !== 'image') {
      Alert.alert('Photos Only', 'Filters can only be saved for photos.');
      return;
    }

    if (!ensureUploadsOpen()) return;

    try {
      const uri = await viewShotRef.current?.capture();
      if (!uri) {
        Alert.alert('Save Failed', 'Could not capture this edited photo.');
        return;
      }

      await uploadMedia({
        uri,
        type: 'image',
        fileName: `filtered_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });

      setSelectedFilter('original');
      setFiltersVisible(false);
    } catch (error) {
      console.error('Save filtered media failed:', error);
      Alert.alert('Save Failed', 'Could not save this edited photo to the event gallery.');
    }
  };

  const rememberImageSize = (itemId, source) => {
    if (!itemId || !source?.width || !source?.height || imageSizes[itemId]) return;
    setImageSizes((current) => ({
      ...current,
      [itemId]: {
        width: source.width,
        height: source.height,
      },
    }));
  };

  const getContainedImageFrame = (itemId) => {
    const source = imageSizes[itemId];
    if (!source?.width || !source?.height) {
      return { width, height: Math.min(height * 0.72, width * 1.25) };
    }

    const maxWidth = width;
    const maxHeight = height * 0.78;
    const imageRatio = source.width / source.height;
    const frameRatio = maxWidth / maxHeight;

    if (imageRatio > frameRatio) {
      return {
        width: maxWidth,
        height: maxWidth / imageRatio,
      };
    }

    return {
      width: maxHeight * imageRatio,
      height: maxHeight,
    };
  };

  const renderFilteredPhoto = (item, filterName) => {
    const filter = colourFilters.find((f) => f.name === filterName) || colourFilters[0];

    return (
      <>
        <Image
          source={{ uri: item.file_url }}
          style={[styles.filteredImage, filter.style]}
          resizeMode="cover"
          onLoad={(event) => rememberImageSize(item.id, event.nativeEvent?.source)}
        />
        {filterName === 'moody' && <View pointerEvents="none" style={styles.moodyOverlay} />}
        {filterName === 'soft' && <View pointerEvents="none" style={styles.softOverlay} />}
        {filterName === 'party' && <View pointerEvents="none" style={styles.partyOverlay} />}
      </>
    );
  };

  const applyFilter = (item, filterName) => {
    const frame = getContainedImageFrame(item.id);

    return (
      <View style={styles.filteredContainer}>
        <View style={[styles.filteredFrame, frame]}>
          {renderFilteredPhoto(item, filterName)}
        </View>
      </View>
    );
  };

  const renderMediaItem = ({ item, index }) => {
    const isVideo = item.media_type === 'video';
    const isVideoMessage = item.caption?.startsWith('Video Message:');

    return (
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={() => {
          if (!hasPaidAccess) {
            Alert.alert('Locked', 'Paid access will be required here.');
            return;
          }
          setSelectedIndex(index);
          setFullScreenVisible(true);
        }}
      >
        {isVideo ? (
          <Video
            source={{ uri: item.file_url }}
            style={styles.thumbnailImage}
            isMuted
            shouldPlay={false}
            resizeMode={ResizeMode.COVER}
          />
        ) : (
          <Image
            source={{ uri: item.thumbnail_url || item.file_url }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        )}

        {(item.uploaded_by === session?.member_name || isOwner) && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              confirmDelete(item.id);
            }}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        )}

        {isVideo && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play" size={18} color="white" />
          </View>
        )}

        {isVideoMessage && (
          <View style={styles.messageTag}>
            <Ionicons name="heart" size={11} color="white" />
            <Text style={styles.messageTagText}>Message</Text>
          </View>
        )}

        <View style={styles.uploaderTag}>
          <Text style={styles.uploaderText}>{item.uploaded_by}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} disabled={!onBack}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={onBack ? 'white' : 'transparent'}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>

            <View style={{ width: 40 }} />
          </View>

          {!resolvedEventId ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>No event selected.</Text>
            </View>
          ) : (
            <FlatList
              ListHeaderComponent={
                <View style={styles.windowBanner}>
                  <View style={styles.windowBannerRow}>
                    <Ionicons
                      name={mediaWindows.uploadsOpen || isOwner ? 'cloud-upload' : 'lock-closed'}
                      size={18}
                      color="#FFD700"
                    />
                    <Text style={styles.windowBannerText}>
                      {isOwner
                        ? `Owner upload access is open. Crew uploads close in ${mediaWindows.uploadCountdownLabel}.`
                        : mediaWindows.uploadStatus}
                    </Text>
                  </View>
                  <View style={styles.windowBannerRow}>
                    <Ionicons
                      name={mediaWindows.downloadsOpen || isOwner ? 'download' : 'time'}
                      size={18}
                      color="#8FAF7A"
                    />
                    <Text style={styles.windowBannerText}>
                      {isOwner
                        ? `Owner downloads are available. Crew download window: ${mediaWindows.downloadCountdownLabel}.`
                        : mediaWindows.downloadStatus}
                    </Text>
                  </View>
                </View>
              }
              data={media}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={[
                styles.thumbnailGrid,
                { paddingBottom: (insets.bottom || 20) + 120 },
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#e94560"
                />
              }
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="images-outline" size={40} color="#666" />
                    <Text style={styles.emptyText}>No media yet</Text>
                    <Text style={styles.emptySub}>
                      Tap Capture or Choose to upload your first photo or video.
                    </Text>
                  </View>
                ) : null
              }
            />
          )}

          <Modal visible={fullScreenVisible} transparent animationType="fade">
            <View style={{ flex: 1 }}>
              <View style={styles.fullscreenContainer}>
                <TouchableOpacity
                  style={styles.fullscreenBack}
                  onPress={() => {
                    setSelectedFilter('original');
                    setFiltersVisible(false);
                    setFullScreenVisible(false);
                  }}
                >
                  <Ionicons name="arrow-back" size={30} color="white" />
                </TouchableOpacity>

                <View style={styles.fullscreenActions}>
                  {media[selectedIndex]?.media_type === 'image' && (
                    <TouchableOpacity
                      style={styles.fullscreenActionButton}
                      onPress={() => setFiltersVisible(!filtersVisible)}
                    >
                      <Ionicons
                        name={filtersVisible ? 'close-circle' : 'color-filter'}
                        size={26}
                        color="white"
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.fullscreenActionButton}
                    onPress={handleShareMedia}
                  >
                    <Ionicons name="share-social" size={25} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.fullscreenActionButton}
                    onPress={handleSaveMedia}
                  >
                    <Ionicons name="download" size={25} color="white" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  pagingEnabled
                  ref={scrollRef}
                  contentOffset={{ x: selectedIndex * width, y: 0 }}
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                    setSelectedIndex(newIndex);
                    setSelectedFilter('original');
                  }}
                >
                  {media.map((item, idx) => (
                    <View key={item.id} style={{ width, height: '100%' }}>
                      {item.media_type === 'video' ? (
                        <View style={styles.fullscreenVideoWrap}>
                          <Video
                            ref={(ref) => {
                              videoRefs.current[idx] = ref;
                            }}
                            source={{ uri: item.file_url }}
                            style={styles.fullscreenMedia}
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={idx === selectedIndex}
                            useNativeControls
                          />
                          {item.caption?.startsWith('Video Message:') && (
                            <View style={styles.fullscreenCaption}>
                              <Text style={styles.fullscreenCaptionText}>{item.caption}</Text>
                            </View>
                          )}
                        </View>
                      ) : idx === selectedIndex ? (
                        <View style={styles.filteredContainer}>
                          <ViewShot
                            ref={viewShotRef}
                            options={{ format: 'jpg', quality: 0.9 }}
                            style={[styles.filteredFrame, getContainedImageFrame(item.id)]}
                          >
                            {renderFilteredPhoto(item, selectedFilter)}
                          </ViewShot>
                        </View>
                      ) : (
                        applyFilter(item, selectedFilter)
                      )}
                    </View>
                  ))}
                </ScrollView>

                {filtersVisible && media[selectedIndex]?.media_type === 'image' && (
                  <View style={[styles.filterBar, { bottom: insets.bottom + 20 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {colourFilters.map((filter) => {
                        const previewUri = media[selectedIndex]?.file_url;

                        return (
                          <TouchableOpacity
                            key={filter.name}
                            onPress={() => setSelectedFilter(filter.name)}
                            style={styles.filterItem}
                          >
                            <View style={styles.filterPreview}>
                              {previewUri && (
                                <>
                                  <Image
                                    source={{ uri: previewUri }}
                                    style={[styles.previewImage, filter.style]}
                                  />
                                  {filter.name === 'moody' && <View pointerEvents="none" style={styles.previewMoodyOverlay} />}
                                  {filter.name === 'soft' && <View pointerEvents="none" style={styles.previewSoftOverlay} />}
                                  {filter.name === 'party' && <View pointerEvents="none" style={styles.previewPartyOverlay} />}
                                </>
                              )}
                            </View>
                            <Text style={styles.filterLabel}>{filter.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveFilteredToGallery}>
                      <Ionicons name="download" size={26} color="white" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>

          <View style={[styles.bottomActionsContainer, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.topActionRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (uploading || (!mediaWindows.uploadsOpen && !isOwner)) && styles.actionButtonDisabled,
                ]}
                disabled={uploading || (!mediaWindows.uploadsOpen && !isOwner)}
                onPress={takeMedia}
              >
                <Ionicons name="camera" size={22} color="white" />
                <Text style={styles.actionButtonText}>
                  {uploading ? 'Uploading...' : 'Capture'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (uploading || (!mediaWindows.uploadsOpen && !isOwner)) && styles.actionButtonDisabled,
                ]}
                disabled={uploading || (!mediaWindows.uploadsOpen && !isOwner)}
                onPress={pickMedia}
              >
                <Ionicons name="image" size={22} color="white" />
                <Text style={styles.actionButtonText}>
                  {uploading ? 'Uploading...' : 'Choose'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
      </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f23' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
    backgroundColor: '#0f0f23',
  },
  backBtn: { padding: 8, width: 40, alignItems: 'flex-start' },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#ff6b6b', fontSize: 16 },
  thumbnailGrid: { paddingHorizontal: 8, paddingVertical: 12 },
  windowBanner: {
    marginHorizontal: 4,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  windowBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  windowBannerText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    flex: 1,
  },
  thumbnailContainer: {
    flex: 1,
    margin: 4,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    position: 'relative',
  },
  thumbnailImage: { width: '100%', height: '100%' },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(233, 69, 96, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(233, 69, 96, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  uploaderTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  uploaderText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e94560',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 130,
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySub: {
    color: '#888',
    marginTop: 4,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  fullscreenMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  fullscreenVideoWrap: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullscreenCaption: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 34,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  fullscreenCaptionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    position: 'absolute',
    width: '100%',
    paddingVertical: 10,
  },
  filterItem: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  filterPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewMoodyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 35, 0.34)',
  },
  previewSoftOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 210, 230, 0.18)',
  },
  previewPartyOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: '#e94560',
    backgroundColor: 'rgba(233, 69, 96, 0.12)',
  },
  filterLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    backgroundColor: '#e94560',
    padding: 14,
    borderRadius: 30,
    elevation: 4,
  },
  fullscreenActions: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    gap: 10,
  },
  fullscreenActionButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    borderRadius: 25,
  },
  fullscreenBack: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    borderRadius: 25,
  },
  bottomActionsContainer: {
    backgroundColor: '#0f0f23',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  filteredContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  filteredFrame: {
    overflow: 'hidden',
    backgroundColor: 'black',
  },
  filteredImage: {
    width: '100%',
    height: '100%',
  },
  moodyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 35, 0.34)',
  },
  softOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 210, 230, 0.18)',
  },
  partyOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 8,
    borderColor: '#e94560',
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
  },
});
