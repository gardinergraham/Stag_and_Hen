import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, typography, spacing, getEventTheme } from '../theme';
import { Card, Button, TextInput } from '../components';
import { shopApi } from '../services/api';
import { useApp } from '../context/AppContext';

const ShopScreen = () => {
  const { session } = useApp();
  const theme = getEventTheme(session?.event_type);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    product_name: '',
    product_url: '',
    notes: '',
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        shopApi.getItems(),
        shopApi.getCategories(),
      ]);
      setItems(itemsRes.data);
      setCategories(categoriesRes.data.categories);
    } catch (error) {
      console.error('Failed to load shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = async (item) => {
    try {
      // Track the click
      const response = await shopApi.trackClick(item.id, session?.member_name, session?.event_id);
      // Open affiliate link
      Linking.openURL(response.data?.affiliate_url || item.affiliate_url);
    } catch (error) {
      // Still open the link even if tracking fails
      Linking.openURL(item.affiliate_url);
    }
  };

  const resetRequestForm = () => {
    Keyboard.dismiss();
    setShowRequestModal(false);
    setRequestForm({
      product_name: '',
      product_url: '',
      notes: '',
    });
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.product_name.trim()) {
      Alert.alert('Product Needed', 'Tell us what item you want added.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await shopApi.createRequest({
        event_id: session?.is_preview ? null : session?.event_id,
        event_name: session?.event_name,
        requester_name: session?.member_name || 'Guest',
        product_name: requestForm.product_name.trim(),
        product_url: requestForm.product_url.trim() || null,
        notes: requestForm.notes.trim() || null,
      });
      resetRequestForm();
      Alert.alert('Request Sent', 'Thanks. We will review it and add it to the shop if it fits.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not send this request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const filteredItems = selectedCategory
    ? items.filter((item) => item.category === selectedCategory)
    : items;

  const getCategoryIcon = (categoryId) => {
    const henIcons = {
      sashes: '🎀',
      hats: '👑',
      decorations: '🎈',
      games: '🎲',
      accessories: '👜',
      costumes: '👗',
      other: '📦',
    };
    const stagIcons = {
      sashes: '🍺',
      hats: '🧢',
      decorations: '🎯',
      games: '🎲',
      accessories: '⌚',
      costumes: '🕶️',
      other: '🧳',
    };
    const icons = session?.event_type === 'stag' ? stagIcons : henIcons;
    return icons[categoryId] || '📦';
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && {
          borderColor: theme.accent,
          backgroundColor: `${theme.accent}20`,
        },
      ]}
      onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
    >
      <Text style={styles.categoryIcon}>{getCategoryIcon(item.id)}</Text>
      <Text
        style={[
          styles.categoryLabel,
          selectedCategory === item.id && { color: theme.accent },
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <Card style={styles.itemCard} onPress={() => handleItemPress(item)}>
      <Image
        source={{ uri: item.image_url }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <Card.Content>
        <Text style={styles.itemCategory}>{getCategoryIcon(item.category)}</Text>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemPrice}>£{item.price.toFixed(2)}</Text>
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={[styles.shopButton, { backgroundColor: theme.accent }]}>
          <Text style={styles.shopButtonText}>View on Amazon →</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Party Shop</Text>
        <Text style={styles.subtitle}>
          {session?.event_type === 'stag'
            ? 'Gear, games and weekend essentials for the lads.'
            : 'Handbags, glam, games and party extras for the girls.'}
        </Text>
        <Button
          title="Request an Item"
          variant="outline"
          color={theme.accent}
          size="small"
          onPress={() => setShowRequestModal(true)}
          style={styles.requestButton}
        />
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      />

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.itemsList}
        columnWrapperStyle={styles.itemsRow}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.emptyText}>No items in this category</Text>
          </View>
        }
      />

      <Modal visible={showRequestModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modalTouchArea}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Request an Item</Text>
                  <Text style={styles.modalSubtitle}>
                    Suggest a product and we can add it to the shop catalogue.
                  </Text>
                  <TextInput
                    label="Item Name *"
                    placeholder="e.g., cowboy hats, pink sashes"
                    value={requestForm.product_name}
                    onChangeText={(text) => setRequestForm({ ...requestForm, product_name: text })}
                  />
                  <TextInput
                    label="Shop Link (Optional)"
                    placeholder="Paste Amazon or shop link"
                    value={requestForm.product_url}
                    onChangeText={(text) => setRequestForm({ ...requestForm, product_url: text })}
                    autoCapitalize="none"
                  />
                  <TextInput
                    label="Notes (Optional)"
                    placeholder="Size, colour, quantity, theme..."
                    value={requestForm.notes}
                    onChangeText={(text) => setRequestForm({ ...requestForm, notes: text })}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.modalActions}>
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={resetRequestForm}
                      style={styles.modalButton}
                    />
                    <Button
                      title="Send Request"
                      variant="primary"
                      loading={submittingRequest}
                      onPress={handleSubmitRequest}
                      style={styles.modalButton}
                    />
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: spacing.md,
  },
  requestButton: {
    alignSelf: 'flex-start',
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  categoryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  itemsList: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  itemsRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  itemCard: {
    width: '48%',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surfaceLight,
  },
  itemCategory: {
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.h3,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  itemDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  shopButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  shopButtonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalTouchArea: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});

export default ShopScreen;
