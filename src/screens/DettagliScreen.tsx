import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Linking,
    Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { textColor, darkBg, darkerBg, theme, dark } from '../../colors';
import { getSingleCustomer } from '../api/prestashop';

type Customer = {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    birthday: string;
    company: string | null;
    active: string;
    date_add: string;
    date_upd: string;
    codice_cmnr: string | null;
    numero_ordinale: string | null;
    note: string | null;
    newsletter: string;
    optin: string;
    website: string | null;
    siret: string | null;
    outstanding_allow_amount: string;
    show_public_prices: string;
    id_risk: number;
    max_payment_days: number;
    is_guest: string;

    [key: string]: any;
};
export default function DettagliScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { customer: customerId } = route.params as { customer: number | string };

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCustomer = async () => {
            if (!customerId) {
                setError('ID cliente mancante');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const res = await getSingleCustomer(customerId);

                if (!res.success || !res.data?.customers?.[0]) {
                    throw new Error('Cliente non trovato');
                }

                setCustomer(res.data.customers[0]);
            } catch (err: any) {
                console.error(' DettagliScreen error:', err);
                setError('Impossibile caricare i dettagli del cliente.');
            } finally {
                setLoading(false);
            }
        };

        fetchCustomer();
    }, [customerId]);

    const formatDate = (isoDate: string): string => {
        if (!isoDate || isoDate === '0000-00-00 00:00:00') return '—';
        const date = new Date(isoDate);
        return isNaN(date.getTime())
            ? '—'
            : date.toLocaleString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
    };

    const yesNo = (val: string | number | null): string =>
        val === '1' || val === 1 ? 'Sì' : 'No';

    const formatCurrency = (val: string): string => {
        const num = parseFloat(val);
        return isNaN(num) ? '—' : `€${num.toFixed(2)}`;
    };

    const handleWebsitePress = (url: string) => {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        Linking.openURL(fullUrl).catch(() => Alert.alert('Errore', 'URL non valido'));
    };

    const handleEmailPress = () => {
        if (customer?.email) {
            Linking.openURL(`mailto:${customer.email}`);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme} />
                    <Text style={styles.statusText}>Caricamento...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !customer) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Nessun dato</Text>
                    <Text style={styles.subText}>{error || ''}</Text>
                </View>
            </SafeAreaView>
        );
    }




    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.customerName}>
                        {customer.firstname} {customer.lastname}
                    </Text>
                    <Text style={styles.customerId}>ID: {customer.id}</Text>
                </View>

                <View style={styles.sectionDivider} />

                {/* 🔹 Personal & Contact */}
                <SectionTitle title="Contatto" />
                <InfoRow label="Email" value={customer.email} isEmail onPress={handleEmailPress} />
                {customer.website && (
                    <InfoRow
                        label="Sito Web"
                        value={customer.website}
                        isLink
                        onPress={() => handleWebsitePress(customer.website!)}
                    />
                )}
                <InfoRow label="Data Nascita" value={formatDate(customer.birthday)} />

                {/* 🔹 Company & IDs */}
                {customer.company && <InfoRow label="Azienda" value={customer.company} />}
                {customer.siret && <InfoRow label="SIRET" value={customer.siret} />}
                <InfoRow label="Codice CMNR" value={customer.codice_cmnr || '—'} />
                <InfoRow label="Num. Ordinale" value={customer.numero_ordinale || '—'} />

                <View style={styles.sectionDivider} />

                {/* 🔹 Preferences */}
                <SectionTitle title="Preferenze" />
                <InfoRow label="Newsletter" value={yesNo(customer.newsletter)} />
                <InfoRow label="Opt-in Marketing" value={yesNo(customer.optin)} />
                <InfoRow label="Prezzi Pubblici" value={yesNo(customer.show_public_prices)} />

                <View style={styles.sectionDivider} />

                {/* 🔹 Status & Risk */}
                <SectionTitle title="Stato & Credito" />
                <InfoRow
                    label="Attivo"
                    value={yesNo(customer.active)}
                    valueStyle={customer.active === '1' ? styles.statusActive : styles.statusInactive}
                />
                <InfoRow label="Ospite" value={yesNo(customer.is_guest)} />
                <InfoRow label="ID Rischio" value={String(customer.id_risk)} />
                <InfoRow label="Max Giorni Pagamento" value={`${customer.max_payment_days} giorni`} />
                <InfoRow label="Credito Residuo" value={formatCurrency(customer.outstanding_allow_amount)} />

                <View style={styles.sectionDivider} />

                {/* 🔹 Notes */}
                {customer.note && (
                    <>
                        <SectionTitle title="Note" />
                        <InfoRow label="" value={customer.note} multiline />
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const SectionTitle = ({ title }: { title: string }) => (
    <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
    </View>
);

const InfoRow = ({
    label,
    value,
    valueStyle,
    onPress,
    isEmail = false,
    isLink = false,
    multiline = false,
}: {
    label: string;
    value: string;
    valueStyle?: any;
    onPress?: () => void;
    isEmail?: boolean;
    isLink?: boolean;
    multiline?: boolean;
}) => (
    <View style={styles.row}>
        {label ? <Text style={styles.label}>{label}:</Text> : <View style={{ width: 90 }} />}
        <Text
            style={[
                styles.value,
                valueStyle,
                isEmail && styles.email,
                isLink && styles.link,
                multiline && { flex: 1 },
            ]}
            onPress={onPress}
            numberOfLines={multiline ? undefined : 1}
        >
            {value}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: dark,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: textColor,
    },
    errorText: {
        fontSize: 16,
        color: '#d32f2f',
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: textColor,
        opacity: 0.7,
    },
    card: {
        backgroundColor: darkBg,
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: darkerBg,

    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '600',
        color: textColor,
        flex: 1,
    },
    ordinal: {
        fontSize: 14,
        fontWeight: '500',
        color: theme,
        backgroundColor: '#e6f0ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    divider: {
        height: 1,
        backgroundColor: darkerBg,
        marginVertical: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0070A7',
        minWidth: 90,
    },
    value: {
        fontSize: 14,
        color: textColor,
        flex: 1,
        textAlign: 'right',
        marginLeft: 8,
    },
    scrollContent: {
        padding: 16,
    },

    statusText: {
        marginTop: 12,
        fontSize: 16,
        color: textColor,
    },

    subText: {
        marginTop: 8,
        fontSize: 14,
        color: textColor,
        textAlign: 'center',
        opacity: 0.8,
    },

    customerName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: textColor,
    },
    customerId: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: darkerBg,
        marginVertical: 12,
    },
    infoGrid: {
        gap: 12,
    },
    email: {
        color: theme,
        textDecorationLine: 'underline',
    },
    statusActive: {
        color: '#2e7d32',
    },
    statusInactive: {
        color: '#d32f2f',
    },
    sectionTitleContainer: {
        marginTop: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: textColor,
    },
    link: {
        color: theme,
        textDecorationLine: 'underline',
    },
});