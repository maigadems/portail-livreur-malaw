import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';

type RatingFilter = 'Tous' | '5 ⭐' | '4 ⭐' | '< 4 ⭐';

const REVIEWS = [
  { stars: 5, comment: 'Excellent service, très poli et rapide. Commande parfaite !', date: 'Auj. 14:32', client: 'A. S.', course: 'Almadies → Ouakam' },
  { stars: 5, comment: 'Livraison à l\'heure, rien ne manquait. Merci !', date: 'Hier 19:20', client: 'M. D.', course: 'Plateau → Médina' },
  { stars: 4, comment: 'Bonne livraison, juste un peu de retard à cause du trafic.', date: '3 juin', client: 'F. B.', course: 'HLM → Grand Yoff' },
  { stars: 5, comment: 'Très professionnel, la commande était bien protégée.', date: '2 juin', client: 'K. N.', course: 'Fann → Ouakam' },
  { stars: 3, comment: 'Correct mais le sac était un peu abîmé à l\'arrivée.', date: '1 juin', client: 'I. T.', course: 'Almadies → Plateau' },
];

export default function EvaluationsScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<RatingFilter>('Tous');
  const filters: RatingFilter[] = ['Tous', '5 ⭐', '4 ⭐', '< 4 ⭐'];

  const avg = (REVIEWS.reduce((a, r) => a + r.stars, 0) / REVIEWS.length).toFixed(1);

  const filtered = REVIEWS.filter(r => {
    if (filter === 'Tous') return true;
    if (filter === '5 ⭐') return r.stars === 5;
    if (filter === '4 ⭐') return r.stars === 4;
    if (filter === '< 4 ⭐') return r.stars < 4;
    return true;
  });

  const starCount = (n: number) => REVIEWS.filter(r => r.stars === n).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Mes évaluations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.avgBlock}>
            <Text style={styles.avgValue}>{avg}</Text>
            <View style={styles.avgStars}>
              {[1, 2, 3, 4, 5].map(i => (
                <Text key={i} style={[styles.star, { opacity: parseFloat(avg) >= i ? 1 : 0.3 }]}>⭐</Text>
              ))}
            </View>
            <Text style={styles.avgCount}>{REVIEWS.length} avis</Text>
          </View>

          <View style={styles.barsBlock}>
            {[5, 4, 3, 2, 1].map(n => (
              <View key={n} style={styles.barRow}>
                <Text style={styles.barLabel}>{n}⭐</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(starCount(n) / REVIEWS.length) * 100}%` as any }]} />
                </View>
                <Text style={styles.barCount}>{starCount(n)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Highlight */}
        <View style={styles.highlightCard}>
          <Text style={styles.highlightIcon}>🏆</Text>
          <View style={styles.highlightText}>
            <Text style={styles.highlightTitle}>Top livreur à Dakar</Text>
            <Text style={styles.highlightDesc}>Vous êtes dans le top 5% des livreurs les mieux notés ce mois-ci</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {filters.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, filter === f && styles.filterPillActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Reviews */}
        <View style={styles.reviewList}>
          {filtered.map((r, i) => (
            <View key={i} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewClient}>
                  <View style={styles.clientAvatar}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{r.client}</Text>
                    <Text style={styles.reviewCourse}>{r.course}</Text>
                  </View>
                </View>
                <View style={styles.reviewMeta}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Text key={s} style={[styles.smallStar, s > r.stars && styles.smallStarEmpty]}>⭐</Text>
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>{r.date}</Text>
                </View>
              </View>
              <Text style={styles.reviewComment}>"{r.comment}"</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNavBar active="profil" homeScreen="DashboardEnLigne" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  topBar: {
    height: 72,
    backgroundColor: Colors.nearBlack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: Colors.gold, fontWeight: '700' },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  summaryCard: {
    borderRadius: Radii.xxl,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 20,
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  avgBlock: {
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  avgValue: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 52,
  },
  avgStars: {
    flexDirection: 'row',
    gap: 2,
  },
  star: { fontSize: 14 },
  avgCount: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  barsBlock: {
    flex: 1,
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    width: 28,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(65,72,67,0.4)',
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.goldLight,
  },
  barCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    width: 16,
    textAlign: 'center',
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(200,150,62,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200,150,62,0.2)',
    padding: 14,
  },
  highlightIcon: { fontSize: 28 },
  highlightText: { flex: 1, gap: 3 },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gold,
    fontFamily: 'Manrope_500Medium',
  },
  highlightDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.gold,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.75,
    lineHeight: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
  },
  filterPillActive: {
    backgroundColor: Colors.goldLight,
    borderColor: Colors.goldLight,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  filterTextActive: {
    fontWeight: '700',
    color: 'rgb(67,44,0)',
  },
  reviewList: { gap: 10 },
  reviewCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewClient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: { gap: 2 },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  reviewCourse: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  reviewMeta: { alignItems: 'flex-end', gap: 3 },
  starsRow: { flexDirection: 'row', gap: 1 },
  smallStar: { fontSize: 12 },
  smallStarEmpty: { opacity: 0.2 },
  reviewDate: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
  },
  reviewComment: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
