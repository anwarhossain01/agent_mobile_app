import React, { useState } from 'react';
import {
    Alert,
    Text,
    TouchableOpacity,
    View,
    Modal,
    FlatList,
    TextInput,
    StyleSheet
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';

import { dark, lightdark } from '../../../colors';
import { setClients } from '../../store/slices/clientsSlice';
import { getCachedClientsForAgentFrontPage } from '../../api/prestashop';


export const ClientHeader = ({ navigation }: { navigation: any }) => {
    const [searchMode, setSearchMode] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [listData, setListData] = useState<[string, number][]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);


    const [selectedFilters, setSelectedFilters] = useState<{
        city?: number | null;
        cap?: number | null;
        ordinale?: number | null;
    }>({
        city: null,
        cap: null,
        ordinale: null,
    });

    const [selectedFilterValues, setSelectedFilterValues] = useState<{
        city?: string | null;
        cap?: string | null;
        ordinale?: string | null;
    }>({
        city: null,
        cap: null,
        ordinale: null,
    });

    const dispatch = useDispatch();
    const auth = useSelector((s: RootState) => s.auth);
    const employeeId = auth.employeeId;

    const classification = useSelector((s: RootState) => s.customerClassification);

    const performSearch = async (
        query: string = searchText.trim(),
        filters = selectedFilterValues
    ) => {
        try {
            const data = await getCachedClientsForAgentFrontPage(
                employeeId || 0,
                query || '',
                filters.city || null,
                filters.ordinale || null,
                filters.cap || null
            );

            dispatch(setClients(data));
        } catch (e) {
            console.log('search err', e);
        }
    };

    const openModal = (title: string) => {
        setModalTitle(title);

        let data: [string, number][] = [];
        switch (title) {
            case 'Ordinale':
                data = classification.numero_ordinale || [];
                setSelectedIndex(
                    typeof selectedFilters.ordinale === 'number' ? selectedFilters.ordinale : null
                );
                break;
            case 'Città':
                data = classification.city || [];
                setSelectedIndex(
                    typeof selectedFilters.city === 'number' ? selectedFilters.city : null
                );
                break;
            case 'CAP':
                data = classification.codice_cmnr || [];
                setSelectedIndex(
                    typeof selectedFilters.cap === 'number' ? selectedFilters.cap : null
                );
                break;
            default:
                setSelectedIndex(null);
        }

        setListData(data);
        setModalVisible(true);
    };

    const applySelection = async () => {
        if (selectedIndex === null) {
            setModalVisible(false);
            return;
        }

        const selectedItem = listData[selectedIndex];
        if (!selectedItem) {
            setModalVisible(false);
            return;
        }
        const selectedText = selectedItem[0];

        let updatedFilters = { ...selectedFilterValues };

        if (modalTitle === 'Città') {
            setSelectedFilters((s) => ({ ...s, city: selectedIndex }));
            updatedFilters.city = selectedText;
        } else if (modalTitle === 'CAP') {
            setSelectedFilters((s) => ({ ...s, cap: selectedIndex }));
            updatedFilters.cap = selectedText;
        } else if (modalTitle === 'Ordinale') {
            setSelectedFilters((s) => ({ ...s, ordinale: selectedIndex }));
            updatedFilters.ordinale = selectedText;
        }

        setSelectedFilterValues(updatedFilters);
        setModalVisible(false);

        await performSearch(searchText.trim(), updatedFilters);
    };

    const cancelSelection = async () => {
        let updatedFilters = { ...selectedFilterValues };

        if (modalTitle === 'Città') {
            setSelectedFilters((s) => ({ ...s, city: null }));
            updatedFilters.city = null;
        } else if (modalTitle === 'CAP') {
            setSelectedFilters((s) => ({ ...s, cap: null }));
            updatedFilters.cap = null;
        } else if (modalTitle === 'Ordinale') {
            setSelectedFilters((s) => ({ ...s, ordinale: null }));
            updatedFilters.ordinale = null;
        }

        setSelectedFilterValues(updatedFilters);
        setSelectedIndex(null);
        setModalVisible(false);

        await performSearch(searchText.trim(), updatedFilters);
    };

    return (
        <>
            <View
                style={[
                    styles.headerContainer,
                    { backgroundColor: searchMode ? lightdark : dark },
                ]}
            >
                {/* Normal Header */}
                {!searchMode && (
                    <>
                        <Text style={styles.title}>Clienti</Text>

                        <View style={styles.iconRow}>
                            <TouchableOpacity onPress={() => setSearchMode(true)} style={styles.iconButton}>
                                <Ionicons name="search" size={22} color="black" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setShowOptions(!showOptions)} style={styles.iconButton}>
                                <Ionicons name="ellipsis-vertical" size={22} color="black" />
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {/* Search Mode */}
                {searchMode && (
                    <View style={styles.searchRow}>
                        <TouchableOpacity
                            onPress={() => {
                                setSearchMode(false);
                                //   setSearchText('');
                            }}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={22} color="black" />
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                            <TextInput
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholder="Ricerca clienti"
                                placeholderTextColor="#666"
                                style={styles.searchInput}
                                autoFocus
                                onSubmitEditing={() => performSearch(searchText.trim(), selectedFilterValues)}
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* Options Panel */}
            {showOptions && !searchMode && (
                <View style={styles.optionsPanel}>
                    {[
                        { label: 'Ordinale', key: 'ordinale' },
                        { label: 'Città', key: 'city' },
                        { label: 'CAP', key: 'cap' },
                    ].map(({ label, key }) => {
                        const value = selectedFilterValues[key as keyof typeof selectedFilterValues];
                        const shortValue =
                            value && value.length > 10 ? `${value.slice(0, 5)}…` : value || '';
                        return (
                            <TouchableOpacity
                                key={key}
                                style={styles.optionButton}
                                onPress={() => openModal(label)}
                            >
                                <Text style={styles.optionText}>
                                    {label}
                                    {shortValue ? `: ${shortValue}` : ''}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="black" />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}


            {/* Modal for classification lists */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>{modalTitle}</Text>

                        <FlatList
                            data={listData}
                            keyExtractor={(item, index) => `${item[0]}-${index}`}
                            renderItem={({ item, index }) => {
                                const isSelected = selectedIndex === index;
                                return (
                                    <TouchableOpacity
                                        onPress={() => setSelectedIndex(index)}
                                        style={[
                                            styles.modalItemRow,
                                            isSelected && styles.modalItemSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.modalItemText,
                                                isSelected && styles.modalItemTextSelected,
                                            ]}
                                        >
                                            {item[0]} ({item[1]})
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        {/* 👇 Action buttons */}
                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity onPress={cancelSelection}>
                                <Text style={styles.modalButtonText}>Cancella</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={applySelection}>
                                <Text style={styles.modalButtonText}>Impostare</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: 5,
        paddingBottom: 2,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
    },
    title: { color: 'black', fontSize: 18, fontWeight: 'bold' },
    iconRow: { flexDirection: 'row' },
    iconButton: { marginLeft: 15 },
    searchRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    backButton: { paddingRight: 10 },
    searchInput: {
        flex: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 35,
        color: 'black',
    },
    optionsPanel: {
        backgroundColor: lightdark,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    optionButton: { flexDirection: 'row', alignItems: 'center' },
    optionText: { fontSize: 14, marginRight: 4, color: 'black' },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
    },
    modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    modalItemRow: {
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        borderRadius: 6,
    },
    modalItemText: { fontSize: 14, color: 'black' },
    modalItemCount: { fontSize: 14, color: '#666' },
    modalButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    modalButtonText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },

    modalItemSelected: {
        backgroundColor: '#d3d3d3', // slightly darker to show selection
    },

    modalItemTextSelected: {
        fontWeight: 'bold',
        color: '#000',
    },
});
