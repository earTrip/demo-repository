import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * @tosspayments/widget-sdk-react-native는 네이티브 모듈(Kotlin/Obj-C)이라 웹 번들에
 * 포함될 수 없다 (실제로 1.5.2 패키징 버그로 Metro web 번들 자체가 깨짐 —
 * lib/module/utils/version.js의 package.json 상대경로 오류). RN 파일 확장자 분기
 * (.native.jsx/.web.jsx)로 분리해 웹에서는 결제 없이 안내만 표시한다.
 */
export default function Paywall({ courseTitle, onClose }) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>이야기의 절정이 기다립니다</Text>
      <Text style={styles.desc}>「{courseTitle}」 결제는 모바일 앱에서만 지원됩니다.</Text>
      <TouchableOpacity style={styles.cta} onPress={onClose}>
        <Text style={styles.ctaText}>닫기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  desc: { color: '#666', marginBottom: 16 },
  cta: { backgroundColor: '#3182f6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
