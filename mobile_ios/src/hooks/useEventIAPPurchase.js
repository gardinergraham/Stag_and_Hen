import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useIAP } from 'expo-iap';
import { paymentsApi } from '../services/api';

export const IOS_EVENT_IAP_PRODUCTS = {
  one_day: 'com.stagandhen.event.oneday',
  extended: 'com.stagandhen.event.extended',
  prime: 'com.stagandhen.event.prime',
};

export const getEventIAPProductId = (tier = 'prime') =>
  IOS_EVENT_IAP_PRODUCTS[tier] || IOS_EVENT_IAP_PRODUCTS.prime;

export const useEventIAPPurchase = () => {
  const pendingPurchaseRef = useRef(null);
  const finishTransactionRef = useRef(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const {
    connected,
    fetchProducts,
    finishTransaction,
    requestPurchase,
    restorePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const pending = pendingPurchaseRef.current;
      if (!pending || purchase.productId !== pending.productId) return;
      if (pending.timeoutId) clearTimeout(pending.timeoutId);

      try {
        const response = await paymentsApi.completeIOSIAP({
          event_id: pending.eventId,
          owner_pin: pending.ownerPin,
          product_id: purchase.productId,
          transaction_id: purchase.transactionId || purchase.id,
          purchase_token: purchase.purchaseToken || null,
        });

        if (finishTransactionRef.current) {
          await finishTransactionRef.current({ purchase, isConsumable: true });
        }

        pending.resolve(response.data);
      } catch (error) {
        pending.reject(error);
      } finally {
        pendingPurchaseRef.current = null;
        setPurchaseLoading(false);
      }
    },
    onPurchaseError: (error) => {
      const pending = pendingPurchaseRef.current;
      if (pending) {
        if (pending.timeoutId) clearTimeout(pending.timeoutId);
        const message = error?.code === 'E_USER_CANCELLED'
          ? 'Purchase was cancelled.'
          : error?.message || 'Apple purchase failed.';
        pending.reject(new Error(message));
        pendingPurchaseRef.current = null;
      }
      setPurchaseLoading(false);
    },
  });

  useEffect(() => {
    finishTransactionRef.current = finishTransaction;
  }, [finishTransaction]);

  const purchaseEventPackage = useCallback(
    ({ eventId, ownerPin, tier }) => {
      if (Platform.OS !== 'ios') {
        return Promise.reject(new Error('Apple in-app purchases are only available on iOS.'));
      }
      if (!eventId || !ownerPin) {
        return Promise.reject(new Error('Event details are missing.'));
      }
      if (!connected) {
        return Promise.reject(new Error('Apple purchases are still connecting. Please try again in a moment.'));
      }

      const productId = getEventIAPProductId(tier);
      setPurchaseLoading(true);

      return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
          const pending = pendingPurchaseRef.current;
          if (pending?.productId === productId) {
            pending.reject(new Error('Purchase timed out. Please try again.'));
            pendingPurchaseRef.current = null;
            setPurchaseLoading(false);
          }
        }, 120000);

        pendingPurchaseRef.current = {
          eventId,
          ownerPin,
          productId,
          resolve,
          reject,
          timeoutId,
        };

        try {
          await fetchProducts({ skus: [productId], type: 'in-app' });
          await requestPurchase({
            request: {
              apple: { sku: productId },
            },
            type: 'in-app',
          });
        } catch (error) {
          clearTimeout(timeoutId);
          pendingPurchaseRef.current = null;
          setPurchaseLoading(false);
          reject(error);
        }
      });
    },
    [connected, fetchProducts, requestPurchase]
  );

  const restoreEventPurchases = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Restore purchases is only available on iOS.');
    }
    if (!connected) {
      throw new Error('Apple purchases are still connecting. Please try again in a moment.');
    }
    await restorePurchases();
  }, [connected, restorePurchases]);

  return {
    connected,
    purchaseEventPackage,
    purchaseLoading,
    restoreEventPurchases,
  };
};
