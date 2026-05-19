import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Button, TextInput, Card } from '../components';
import { shopApi } from '../services/api';
import { useApp } from '../context/AppContext';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  affiliate_url: '',
  image_url: '',
  category: 'other',
};

const AdminSettingsScreen = ({ route }) => {
  const { session, isOwner } = useApp();
  const adminUsername = route?.params?.adminUsername;
  const adminPassword = route?.params?.adminPassword;
  const hasGlobalAdmin = adminUsername === 'GrahamAdmin' && adminPassword === '1234';
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadShopData = async () => {
    setLoading(true);
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        shopApi.getItems(),
        shopApi.getCategories(),
      ]);
      setItems(itemsRes.data);
      setCategories(categoriesRes.data.categories);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not load shop settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShopData();
  }, []);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    const price = Number.parseFloat(form.price);

    if (!hasGlobalAdmin && (!isOwner || !session?.owner_pin)) {
      Alert.alert('Admin Access Needed', 'Please log in as admin or event owner again.');
      return;
    }

    if (!form.name.trim() || !form.affiliate_url.trim() || !form.image_url.trim()) {
      Alert.alert('Missing Info', 'Please add a name, product image URL, and shop link.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid product price.');
      return;
    }

    setSaving(true);
    try {
      await shopApi.createItem(
        {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price,
          affiliate_url: form.affiliate_url.trim(),
          image_url: form.image_url.trim(),
          category: form.category,
        },
        session?.event_id,
        session?.owner_pin,
        adminUsername,
        adminPassword
      );

      setForm(emptyForm);
      await loadShopData();
      Alert.alert('Item Added', 'This product is now visible in the party shop.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not add this shop item.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner && !hasGlobalAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Admin Settings</Text>
          <Text style={styles.subtitle}>Only admins or event organizers can manage shop items.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Admin Settings</Text>
        <Text style={styles.subtitle}>Add products your group can browse in the party shop.</Text>

        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>New Shop Item</Text>

            <TextInput
              label="Product Name *"
              placeholder="Bride squad sash pack"
              value={form.name}
              onChangeText={(text) => updateForm('name', text)}
            />

            <TextInput
              label="Price *"
              placeholder="12.99"
              value={form.price}
              onChangeText={(text) => updateForm('price', text)}
              keyboardType="decimal-pad"
            />

            <TextInput
              label="Affiliate or Shop Link *"
              placeholder="https://www.amazon.co.uk/dp/..."
              value={form.affiliate_url}
              onChangeText={(text) => updateForm('affiliate_url', text)}
              autoCapitalize="none"
            />

            <TextInput
              label="Image URL *"
              placeholder="https://..."
              value={form.image_url}
              onChangeText={(text) => updateForm('image_url', text)}
              autoCapitalize="none"
            />

            <TextInput
              label="Description"
              placeholder="Short note for the group"
              value={form.description}
              onChangeText={(text) => updateForm('description', text)}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                const active = form.category === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => updateForm('category', category.id)}
                  >
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Add Shop Item"
              variant="primary"
              size="large"
              loading={saving}
              onPress={handleSave}
              style={styles.saveButton}
            />
          </Card.Content>
        </Card>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Current Items</Text>
          <TouchableOpacity onPress={loadShopData} disabled={loading}>
            <Text style={styles.refreshText}>{loading ? 'Loading...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        {items.map((item) => (
          <Card key={item.id} style={styles.itemCard}>
            <Card.Content style={styles.itemContent}>
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  £{Number(item.price).toFixed(2)} · {item.category}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  formCard: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  categoryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.primary,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshText: {
    ...typography.bodySmall,
    color: colors.secondaryLight,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    marginRight: spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  itemMeta: {
    ...typography.bodySmall,
    color: colors.gold,
    marginTop: spacing.xs,
  },
});

export default AdminSettingsScreen;
