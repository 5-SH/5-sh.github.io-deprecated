---
layout: post
title: 대규모 시스템으로 설계된 게시판의 성능 - DB 조회
date: 2025-04-01 23:50:00 + 0900
categories: Traffic
ref: java, Spring, board, traffic
---

### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard)

# 대규모 시스템으로 설계된 게시판의 성능 - DB 조회

![1 인덱스 없이 조회](https://i.imgur.com/oHudGdq.jpeg)

![2 인덱스 없이 쿼리조회 실행계획](https://i.imgur.com/4xTDcDk.jpeg)

![3 ARTICLE INDEX 추가](https://i.imgur.com/QS9oloR.jpeg)

![4 인덱스 추가해 쿼리조회](https://i.imgur.com/tnb0BiD.jpeg)

![5 인덱스 추가해 쿼리조회 실행계획](https://i.imgur.com/B4cZpGa.jpeg)

![6 오프셋 1499970 조회](https://i.imgur.com/3GRD5d6.jpeg)

![7 오프셋 1499970 실행계획](https://i.imgur.com/WgSOFXF.jpeg)

![8 커버링 인덱스 사용](https://i.imgur.com/VNVSF0d.jpeg)

![9 커버링 인덱스 실행계획](https://i.imgur.com/Ij9Zozf.jpeg)

![10 매우 큰 오프셋 조회](https://i.imgur.com/rtFsVXq.jpeg)

![11 매우 큰 오프셋 조회 실행계획](https://i.imgur.com/rSDftjg.jpeg)