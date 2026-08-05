package com.eartrip.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    /**
     * 쉼표로 여러 오리진을 받는다. 웹 프론트엔드(Vite :5173)와 Expo 웹(:8081)이
     * 포트가 달라 하나만 허용하면 다른 쪽이 조용히 CORS로 막힌다 —
     * 브라우저 콘솔에만 뜨고 서버 로그에는 아무것도 안 남아 원인 찾기가 오래 걸린다.
     * (네이티브 앱은 CORS 대상이 아니라 영향 없음.)
     */
    @Value("${app.cors.frontend:http://localhost:5173,http://localhost:8081}")
    private String frontend;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = Arrays.stream(frontend.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addMapping("/api/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST")
                .allowedHeaders("*");
    }
}
