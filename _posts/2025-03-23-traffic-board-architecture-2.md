---
layout: post
title: 대규모 시스템으로 설계된 게시판의 구조 - Hot Article, Article Read
date: 2025-03-27 23:50:00 + 0900
categories: Spring
ref: java, Spring, board, traffic
---

### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard)

# 대규모 시스템으로 설계된 게시판의 구조 - Hot Article, Article Read

## 0. 서비스 별로 다루는 기술들

|No|서비스|목적|기술|
|---|---|---|---|
|1|Article|게시글 관리|DB Index(clustered, secondary, covering index), 페이징(limit, offset)|
|2|Comment|댓글 관리|2 depth(인접리스트), 무한 depth(경로 열거)|
|3|Like|좋아요 관리|일관성(Transaction), 동시성(pessimistic, optimistic lock, 비동기 순차처리)|
|4|View|조회수 관리|Redis, TTL을 통한 Distributed Lock|
|5|Hot Article|인기글 관리|Consumer-Event Driven Architecture / Producer-Transactional Message(Transactional Outbox), shard key coordinator|
|6|Article Read|게시글 조회 개선|CQRS, Redis Cache, Request Collapsing|

## 1. Hot Article

{::nomarkdown}
<div class="mermaid">
  graph TD;
    A[사용자] --> B[서버]
    B --> C[데이터베이스]
</div>
{:/nomarkdown}

{::nomarkdown}
<div class="mermaid">
    graph TD;
        A[시작] --> B{결정};
        B -->|예| C[진행];
        B -->|아니오| D[종료];
</div>
{:/nomarkdown}

{::nomarkdown}
<div class="mermaid">
    graph TD;
        subgraph Gateway
            A[API Gateway]
        end

        subgraph Microservices
            B[User Service]
            C[Order Service]
            D[Payment Service]
        end

        subgraph Databases
            E[PostgreSQL]
            F[Redis Cache]
        end

        A -->|REST API| B
        A -->|REST API| C
        A -->|REST API| D
        B -->|데이터 저장| E
        C -->|세션 캐싱| F
        D -->|결제 정보 저장| E
</div>
{:/nomarkdown}

## 2. Article Read