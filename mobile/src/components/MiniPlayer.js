import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { subscribePlayback, pause, resume, skipNext, restartCurrent } from '../player/trackQueue';
import { colors } from '../theme';

/**
 * 하단 탭바 바로 위에 고정으로 얹히는 미니 재생바(재생바.jpg 스케치).
 * 항상 표시되되 최소한으로 — 재생 중이면 씬 정보+진행바+컨트롤, 유휴 상태면
 * 얇은 빈 진행바와 흐린 컨트롤만 남긴다(안내 문구·썸네일 없음).
 */
export default function MiniPlayer() {
  const navigation = useNavigation();
  const [pb, setPb] = useState({ scene: null, positionSec: 0, durationSec: 0, isPlaying: false, courseTitle: null });

  useEffect(() => subscribePlayback(setPb), []);

  const idle = !pb.scene;
  const total = pb.durationSec || pb.scene?.estimatedSec || 0;
  const progress = total > 0 ? Math.min(1, pb.positionSec / total) : 0;

  return (
    <View style={styles.wrap}>
      {!idle && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      )}
      <View style={styles.row}>
        {idle ? (
          <View style={styles.info} />
        ) : (
          <TouchableOpacity style={styles.info} activeOpacity={0.7} onPress={() => navigation.navigate('Player')} accessibilityLabel="플레이어 열기">
            <Text style={styles.title} numberOfLines={1}>{pb.scene.title}</Text>
            {pb.courseTitle ? <Text style={styles.sub} numberOfLines={1}>{pb.courseTitle}</Text> : null}
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={restartCurrent} disabled={idle} style={styles.btn} accessibilityLabel="처음부터">
          <Text style={[styles.icon, idle && styles.iconDim]}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => (pb.isPlaying ? pause() : resume())} disabled={idle} style={styles.btn} accessibilityLabel={pb.isPlaying ? '일시정지' : '재생'}>
          <Text style={[styles.iconMain, idle && styles.iconDim]}>{pb.isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={skipNext} disabled={idle} style={styles.btn} accessibilityLabel="다음">
          <Text style={[styles.icon, idle && styles.iconDim]}>⏭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.white },
  track: { height: 2, backgroundColor: '#edeef2' },
  fill: { height: 2, backgroundColor: colors.purple },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, paddingVertical: 8 },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, // A27 터치 타깃 ≥44
  icon: { fontSize: 20, color: colors.ink },
  iconMain: { fontSize: 24, color: colors.purple },
  iconDim: { color: '#d3d6df' },
});
