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
} from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Card } from '../components';
import { shopApi } from '../services/api';
import { useApp } from '../context/AppContext';

const ShopScreen = () => {
  const { session } = useApp();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const filteredItems = selectedCategory
    ? items.filter((item) => item.category === selectedCategory)
    : items;

  const getCategoryIcon = (categoryId) => {
    const icons = {
      sashes: '🎀',
      hats: '👑',
      decorations: '🎈',
      games: '🎲',
      accessories: '👓',
      costumes: '👗',
      other: '📦',
    };
    return icons[categoryId] || '📦';
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
    >
      <Text style={styles.categoryIcon}>{getCategoryIcon(item.id)}</Text>
      <Text
        style={[
          styles.categoryLabel,
          selectedCategory === item.id && styles.categoryLabelActive,
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
        <View style={styles.shopButton}>
          <Text style={styles.shopButtonText}>View on Amazon →</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Party Shop</Text>
        <Text style={styles.subtitle}>Everything you need for the perfect party!</Text>
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
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  categoryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  categoryLabelActive: {
    color: colors.primary,
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
});

export default ShopScreen;
