---
layout: post
title: 대규모 시스템으로 설계된 게시판의 성능 - 테스트 도구
date: 2025-04-15 16:50:00 + 0900
categories: [traffic]
tags: [java, spring, board, traffic]
---

<!-- ### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard) -->

# 대규모 시스템으로 설계된 게시판의 성능 - 테스트 도구

시스템의 성능, 부하 테스트를 위한 도구로 K6를 사용한다. K6의 특징은 다음과 같다.   

- JavaScript로 테스트 스크립트를 작성할 수 있다.
- JMeter, Grinder에 비해 부가 기능은 부족하지만 가볍고 더 많은 동시 요청을 보낼 수 있음
- 별도의 플러그인 없이 테스트 결과를 JSON이나 간단한 대시보드로 제공한다. 필요 시 Grafana와 통합을 통해 실시간 대시보드를 제공할 수 있다.

JavaScript 언어에 익숙하고 당장 게시판 서비스를 클라우드 환경에서 테스트할 계획은 없고 하나의 서버에서 여러 서비스를 실행할 계획이다.   
따라서 성능, 부하 테스트를 위해 많이 사용하는 JMeter, Grinder 대신 K6를 사용한다.

## 1. Get Started

k6 테스트 스크립트를 작성하기 위해 Default function과 options function을 작성해야 한다.   
options function에는 virtual user, 테스트 기간, 반복, threshold 등 테스트 실행에 대한 설정을 할 수 있다.   
Default function은 어떤 요청을 어떻게 보낼지 같은 테스트 방법을 작성한다.

```javascript
// k6 run my-first-test.js

import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
    iterations: 10,
};

export default function () {
    const res = http.get('http://localhost:9000/v1/articles?boardId=1&pageSize=10&page=1');

    sleep(1);
}
```

## 2. Metrics

시스템의 성능과 안전성을 평가하기 위해 아래와 같이 기본 메트릭들을 제공한다.    

| 메트릭 이름           | 설명                                      | 유형       | 세부 항목                          |
|-----------------------|-------------------------------------------|------------|------------------------------------|
| http_reqs             | HTTP 요청의 총 수                         | Counter    | -                                  |
| http_req_duration     | HTTP 요청의 전체 지속 시간 (밀리초)       | Trend      | 평균, 최소, 최대, 표준 편차, 백분위수 (p(90), p(95), p(99)) |
| http_req_blocked      | HTTP 요청이 대기열에서 대기한 시간 (밀리초) | Trend      | -                                  |
| http_req_connecting   | HTTP 요청이 서버에 연결하는 데 걸린 시간 (밀리초) | Trend      | -                                  |
| http_req_tls_handshaking | HTTP 요청이 TLS 핸드셰이크를 수행하는 데 걸린 시간 (밀리초) | Trend      | -                                  |
| http_req_sending      | HTTP 요청을 보내는 데 걸린 시간 (밀리초)  | Trend      | -                                  |
| http_req_waiting      | 서버 응답을 기다리는 데 걸린 시간 (밀리초) | Trend      | -                                  |
| http_req_receiving    | 서버 응답을 받는 데 걸린 시간 (밀리초)    | Trend      | -                                  |
| http_req_failed       | 실패한 HTTP 요청의 비율                   | Rate       | -                                  |
| iterations            | 테스트 함수가 실행된 횟수                 | Counter    | -                                  |
| vus                   | 현재 활성화된 가상 사용자(Virtual Users)의 수 | Gauge      | -                                  |
| vus_max               | 테스트 중에 활성화된 최대 가상 사용자 수  | Gauge      | -                                  |

![](https://i.imgur.com/nQoupDd.png)

## 3. Check

테스트 중에 특정 조건을 검증하는데 사용된다. 
check 함수는 HTTP 응답 값 같은 것들이 조건을 충족하는지 확인하고 테스트의 성공 여부를 평가할 수 있다.   
check 함수는 부울 값을 반환하고고 결과는 checks 메트릭에 반영된다.

```javascript
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    iterations: 10,
};

export default function () {
    const res = http.get('http://localhost:9000/v1/articles?boardId=1&pageSize=10&page=1');

    check(res, { 'status was 200': r => r.status === 200 });

    sleep(1);
}
```

![](https://i.imgur.com/0EkkGG5.png)

## 4. Threshold

테스트의 성공 여부를 판단하는 기준이다. threshold에 응답 시간, 실패율 등 조건을 설정하고 테스트가 조건을 충족하지 않으면 중단된다.
threshold를 사용해 다음과 같은 테스트 조건을 만들 수 있다.

- 요청의 1% 미만이 오류를 반환해야 한다.
- 요청의 95%가 응답 시간이 200ms 미만이어야 한다.
- 요청의 99%가 400ms 미만의 응답 시간을 가져야 한다.
- 특정 엔드포인트는 하상 300ms 이내에 응답해야 한다.

threshold의 조건은 다음과 같은 문자열 형식으로 표현할 수 있다.

- 백분위: "p(N)<value", "p(N)<=value" ex) p(95)<500 (95% 응답시간이 500ms 미만이어야 함)
- 평균: "avg<value", "avg<=value" ex) avg<200 (평균 응답시간이 200ms 미만이어야 함)
- 최대: "max<value", "max<=value" ex) max<1000 (최대 응답시간이 1000ms 미만이어야 함)
- 최소: "min<value", "min<=value" ex) min>100 (최소 응답시간이 100ms를 초과해야 함)
- 비율: "rate<value", "rate<=value" ex) rate<0.01 (실패율이 1% 미만이어야 함)

k6에서 사용할 수 있는 메트릭 종류는 다음과 같습니다:

- http_req_duration: HTTP 요청의 전체 지속 시간 (밀리초)
- http_req_failed: 실패한 HTTP 요청의 비율
- http_req_sending: HTTP 요청을 보내는 데 걸린 시간 (밀리초)
- http_req_waiting: 서버 응답을 기다리는 데 걸린 시간 (밀리초)
- http_req_receiving: 서버 응답을 받는 데 걸린 시간 (밀리초)
- checks: check 함수의 성공 비율

```javascript
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    iterations: 10,
    thresholds: {
        'http_req_duration': ['p(95)<10'], // 95% 응답 시간이 10ms 미만이어야 함
        'http_req_failed': ['rate<0.01'] // 실패율이 1% 미만이어야 함
    }
};

export default function () {
    const res = http.get('http://localhost:9000/v1/articles?boardId=1&pageSize=10&page=1');

    check(res, { 'status was 200': r => r.status === 200 });

    sleep(1);
}
```

![](https://i.imgur.com/5cwbkE3.png)

## 5. Scenarios

virtual user, 요청 반복 계획, 실행 시간, 부하 패턴 등을 세부적으로 구성하는 방법을 제공해 다양한 트래픽 패턴을 구현할 수 있도록 한다.   
scenario는 k6 스크립트의 options 객체 내에서 정의되고 executor를 통해 실행 방식을 정의한다.   

## 6. Executors

executors는 부하 테스트를 실행하는 방법을 정의한다. virtual user와 실행 방식을 제어해 다양한 부하 시나리오를 테스트 한다.   
executors는 option의 scenario에서 설정할 수 있다.   

### 6-1. shared-iterations

고정된 요청 횟수를 virtual user가 나누어 실행

![](https://grafana.com/media/docs/k6-oss/shared-iterations.png)
*https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/shared-iterations/*


```javascript
...
export const options = {
  scenarios: {
    my_scenario: {
      executor: 'shared-iterations',
      vus: 10, // 가상 사용자 수
      iterations: 100, // 총 반복 횟수
      maxDuration: '1m', // 최대 실행 시간
    },
  },
};
...
```

### 6-2. per-vu-iterations

각 virtual user가 고정된 수의 반복을 실행

![](https://grafana.com/media/docs/k6-oss/per-vu-iterations.png)
*https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/per-vu-iterations/*


```javascript
...
export const options = {
  scenarios: {
    my_scenario: {
      executor: 'per-vu-iterations',
      vus: 10, // 가상 사용자 수
      iterations: 20, // 각 가상 사용자가 실행할 반복 횟수
      maxDuration: '1m', // 최대 실행 시간
    },
  },
};
...
```

### 6-3. constant-vus

virtual user가 지정된 시간 만큼 최대한 많이 요청

![](https://grafana.com/media/docs/k6-oss/constant-vus.png)
*https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-vus/*


```javascript
...
export const options = {
  scenarios: {
    my_scenario: {
      executor: 'constant-vus',
      vus: 10, // 가상 사용자 수
      duration: '30s', // 실행 시간
    },
  },
};
...
```

### 6-4. ramping-vus

virtual user의 수를 stage에 정의된 대로 점진적으로 증가시키거나 감소시킴

![](https://grafana.com/media/docs/k6-oss/ramping-vus.png)
*https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/*


```javascript
...
export const options = {
  scenarios: {
    my_scenario: {
      executor: 'ramping-vus',
      startVUs: 0, // 시작 가상 사용자 수
      stages: [
        { duration: '10s', target: 10 }, // 10초 동안 10명의 가상 사용자로 증가
        { duration: '20s', target: 20 }, // 20초 동안 20명의 가상 사용자로 증가
        { duration: '10s', target: 0 },  // 10초 동안 0명의 가상 사용자로 감소
      ],
    },
  },
};
...
```

### 6-5. constant-arrival-rate 

정해진 시간 동안 정해진 요청(rate/timeunit)을 최소, 최대 virtual user 내에서 실행

![](https://grafana.com/media/docs/k6-oss/constant-arrival-rate.png)
*https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/*


```javascript
...
export const options = {
  scenarios: {
    my_scenario: {
      executor: 'constant-arrival-rate',
      rate: 10, // 초당 요청 수
      timeUnit: '1s', // 시간 단위
      duration: '30s', // 실행 시간
      preAllocatedVUs: 20, // 사전 할당된 가상 사용자 수
      maxVUs: 50, // 최대 가상 사용자 수
    },
  },
};
...
```

### 6-6. ramping-arrival-rate

stages에 정의된 target 만큼의 요청을 duration 동안 수행함

![](https://grafana.com/media/docs/k6-oss/ramping-arrival-rate.png)
*https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-arrival-rate/*


```javascript
...
export const options = {
  scenarios: {
    my_scenario: {
      executor: 'ramping-arrival-rate',
      startRate: 0, // 시작 요청 속도
      timeUnit: '1s', // 시간 단위
      stages: [
        { duration: '10s', target: 10 }, // 10초 동안 초당 10개의 요청으로 증가
        { duration: '20s', target: 20 }, // 20초 동안 초당 20개의 요청으로 증가
        { duration: '10s', target: 0 },  // 10초 동안 초당 0개의 요청으로 감소
      ],
      preAllocatedVUs: 20, // 사전 할당된 가상 사용자 수
      maxVUs: 50, // 최대 가상 사용자 수
    },
  },
};
...
```

## 7. Load Test Types

| No | Load Test Type      | 설명                                                                                   |
|----|---------------------|----------------------------------------------------------------------------------------|
| 1  | Smoke Testing       | 시스템의 기본 기능이 제대로 작동하는지 확인하기 위해 간단한 테스트를 한다. 최소한의 부하를 사용한다. |
| 2  | Average Load Testing | 시스템에 평균적인 부하를 줘서 테스트 한다. |
| 3  | Stress Testing      | 시스템의 한계를 테스트하고, 과부하 상태에서의 반응을 평가하기 위한 테스트. Average Load Testing과 유사하지만 더 많은 요청을 보낸다. |
| 4  | Soak Testing        | 장시간 동안 시스템의 안정성을 평가하기 위한 테스트. 보통 3, 4, 8, 12, 24, 48~72 시간을 테스트 한다. |
| 5  | Spike Testing       | 짧은 시간 동안 급격한 부하 변화를 시뮬레이션하여 시스템의 반응을 평가하기 위한 테스트 |
| 6  | Break point Testing | 시스템의 한계를 찾기 위한 테스트. |

![](https://grafana.com/media/docs/k6-oss/chart-load-test-types-overview.png)
*https://grafana.com/load-testing/types-of-load-testing/*
