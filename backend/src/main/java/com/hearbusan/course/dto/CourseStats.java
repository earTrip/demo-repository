package com.hearbusan.course.dto;

// 핵심 성공지표: 완주율
public record CourseStats(long starts, long completions, double completionRate) {}
