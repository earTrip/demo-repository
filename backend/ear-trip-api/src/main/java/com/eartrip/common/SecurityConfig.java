package com.eartrip.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Supabase가 발급한 JWT만 검증하는 리소스 서버로 동작한다 (다른 Supabase 서비스는 사용하지 않음).
 * 코스 목록만 비로그인 열람 가능, 나머지 /api/**는 유효한 Supabase 세션(익명 포함)을 요구한다.
 */
@Configuration
public class SecurityConfig {

    /**
     * 개발 전용 스위치 — 기본값 false(운영은 항상 인증 요구).
     *
     * Supabase 프로젝트 없이 코스 상세를 확인해야 할 때만 켠다. 켜도 토큰이 없으면
     * 비로그인 사용자로 취급되므로(owned=false) 무료 씬 1~2만 열리고 3~5는 잠긴 채로 나간다 —
     * 즉 페이월을 무력화하지는 않는다. CourseController.detail()의 jwt null 처리와 짝이다.
     *
     * 켜는 법: -Dapp.dev.permit-anonymous-course-detail=true (application.yml에 넣지 말 것)
     */
    @Value("${app.dev.permit-anonymous-course-detail:false}")
    private boolean permitAnonymousCourseDetail;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/courses").permitAll();
                    if (permitAnonymousCourseDetail) {
                        auth.requestMatchers(HttpMethod.GET, "/api/courses/*").permitAll();
                    }
                    auth.anyRequest().authenticated();
                })
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));
        return http.build();
    }
}
