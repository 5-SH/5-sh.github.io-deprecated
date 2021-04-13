---
layout: post
title: observer pattern 을 활용해 vue.js 의 computed 속성 구현
date: 2021-04-13 18:30:00 + 0900
categories: Javascript
ref: javascript, observer pattern, computed
---

# observer pattern 을 활용해 vue.js 의 comptued 속성 구현
  - person 객체에 age 속성이 있다.
  - person 의 age 에 종속성을 가지는 status compted 함수가 있다.   
    status 함수는 age 가 18을 넘으면 adult, 안 넘으면 minor 를 리턴한다
  - person.age 가 변경되면 status 함수를 호출할 필요 없이 자동으로   
    status 값이 변경되도록 하고 싶다.(종속성 대상의 변화 추적)
    
## 1. reactive.js
```javascript
const { DependencyTracker } = require('./dependency');
 
module.exports = {
  reactive: (obj, key, v) => {
    // Person 의 property 에 종속성을 가지는 computed 함수 리스트
    let deps = [];
    Object.defineProperty(obj, key, {
      get: () => {
        // dep 에 종속성 등록이 필요한 함수가 있고 Person 에 종속성 등록이 안되어 있으면 등록한다.
        if (DependencyTracker.target && deps.indexOf(DependencyTracker.target) === -1) {
          deps.push(DependencyTracker.target);
        }
        return v;
      },
      set: nv => {
        v = nv;
        for (const dep of deps) {
          // 종속성이 등록된 computed 함수를 호출한다.
          dep();
        }
      }
    });
  }
} 
```

## 2. computed.js
```javascript
const { DependencyTracker } = require('./dependency');

module.exports = {
  computed: (obj, key, f, cb) => {
    const dependencyUpdate = () => {
      const value = f();
      cb(value);
    }
  }
  
  Object.defineProperty(obj, key, {
    // computed function 이 call 되면 종속성 추가 과정을 진행한다.
    get: () => {
      DependencyTracker.target = dependencyUpdate;
      
      // Person.age 의 getter 를 호출, 호출된 getter 에서 computed 함수 status 의 종속성을 등록한다.
      const value = f();
      
      // 종속성을 등록하고 빠짐
      DependencyTracker.target = null;
      
      return value;
    },
    set: () => {
      console.warn('nope');
    }
  }  
}
```

## 3. dependency.js
```javascript
module.exports = {
  // 종속성 추적기, computed 함수를 객체 property 에 종속하도록 한다.
  DependencyTracker: {
    // 종속성 등록이 필요한 computed 함수
    target: null
  }
}
```

## 4. main.js
```javascript
const { reactive } = require('./reactive');
const { computed } = require('./computed');

const person = {};
reactive(person, 'age', 16);
reactive(person, 'country', 'Brazil');

// Person.age 에 종속성을 가지는 computed function 'status' 추가
// status 함수는 person.age(종속성 대상) 의 변화 추적이 필요하다.
// person.age 가 변경되면 status 하무를 호출하지 않아도 자동으로 변경 

computed(
  person,
  'status',
  () => {
    if (person.age > 18) {
      return 'Adult';
    } else {
      return 'Minor';
    }
  },
  v => console.log('CHANGED, The person's status is now: ' + v);
);

console.log('Current age: ' + person.age);
console.log('Current status: ' + person.status);

// change age
console.log('change age');
person.age = 22;

// change country. Note that status update doesn't trigger
console.log('change country');
person.country = 'Chile';
```

## 5. 분석
![FT_2021-04-13 15_25_24 510](https://user-images.githubusercontent.com/13375810/114507035-8912a180-9c6d-11eb-9e82-7dcd6b12e236.png)