# Class 10 Maths — Chapter 1: Real Numbers
## (Vapi Teaching Script + Q&A Knowledge Base)

---

## HOW TO USE THIS FILE WITH VAPI

This file is structured so Vapi can:
1. **Teach** each concept step-by-step in simple, clear English
2. **Answer** any student question from the Q&A bank at the end
3. **Give examples** that a Class 10 student can instantly understand

---

## PART 1: TEACHING CONTENT

---

### CONCEPT 1 — Euclid's Division Lemma

**Simple Definition:**
For any two positive integers `a` and `b`, there always exist unique integers `q` and `r` such that:

> **a = b × q + r**   where   **0 ≤ r < b**

- `a` = dividend (the number being divided)
- `b` = divisor (the number we divide by)
- `q` = quotient (the result)
- `r` = remainder (what is left over)

**Real-Life Example:**
You have 23 chocolates and want to distribute them equally among 5 friends.
- 23 = 5 × 4 + 3
- Each friend gets 4 chocolates, and 3 are left over.
- Here: a = 23, b = 5, q = 4, r = 3

**Key Point:** The remainder `r` is always greater than or equal to 0, and strictly less than `b`. The remainder can never be equal to or greater than `b`.

---

### CONCEPT 2 — Euclid's Division Algorithm (Finding HCF)

**What is it?**
A systematic step-by-step method to find the HCF (Highest Common Factor) of two numbers.

**Steps:**
1. Divide the larger number by the smaller one → apply the Lemma: a = b×q + r
2. If r = 0, then HCF = b (the smaller number)
3. If r ≠ 0, replace a with b and b with r → repeat step 1
4. Keep repeating until the remainder becomes 0

**Example: HCF of 135 and 225**

```
Step 1: 225 = 135 × 1 + 90
Step 2: 135 = 90  × 1 + 45
Step 3: 90  = 45  × 2 + 0   ← remainder is 0, stop!
```

**HCF = 45** ✓

**Example: HCF of 867 and 255**

```
Step 1: 867 = 255 × 3 + 102
Step 2: 255 = 102 × 2 + 51
Step 3: 102 = 51  × 2 + 0   ← stop!
```

**HCF = 51** ✓

**Why it works:** At each step the numbers get smaller, so the remainder will eventually reach 0.

---

### CONCEPT 3 — Fundamental Theorem of Arithmetic

**The Core Idea:**
Every natural number greater than 1 can be expressed as a product of prime numbers — and this factorization is **unique** (apart from the order of factors).

> **Every composite number = product of primes (in exactly one way)**

**Examples:**

| Number | Prime Factorization |
|--------|-------------------|
| 12 | 2 × 2 × 3 = 2² × 3 |
| 36 | 2² × 3² |
| 100 | 2² × 5² |
| 420 | 2² × 3 × 5 × 7 |
| 3825 | 3² × 5² × 17 |

**Important Use — Finding HCF & LCM using Prime Factorization:**

- **HCF** = product of **lowest powers** of all common prime factors
- **LCM** = product of **highest powers** of all prime factors present

**Example: HCF and LCM of 12 and 18**

```
12 = 2² × 3¹
18 = 2¹ × 3²

HCF = 2¹ × 3¹ = 6
LCM = 2² × 3² = 36
```

**Golden Formula (appears frequently in exams!):**
> **HCF × LCM = Product of the two numbers**
> 6 × 36 = 216 = 12 × 18 ✓

---

### CONCEPT 4 — Irrational Numbers

**Definition:**
Numbers that **cannot** be written in the form **p/q** (where p and q are integers and q ≠ 0) are called irrational numbers.

**Common Irrational Numbers:**
- √2, √3, √5, √7 (square roots of non-perfect-square numbers)
- π (pi = 3.14159...)
- e (Euler's number = 2.718...)

**PROOF: √2 is irrational (Essential for exams!)**

Method: Proof by Contradiction

> Assume √2 is rational.
> Then √2 = p/q, where p and q are co-prime integers (HCF = 1) and q ≠ 0.
>
> Squaring both sides: 2 = p²/q²
> So: p² = 2q²
>
> This means p² is even → p is also even (because odd × odd = odd)
> So let p = 2m for some integer m.
>
> Substituting: (2m)² = 2q²
> 4m² = 2q²
> 2m² = q²
>
> This means q² is even → q is also even.
>
> But wait — we assumed p and q are co-prime!
> Both cannot be even (they would share a common factor of 2).
> **CONTRADICTION!**
>
> Our assumption was wrong. Therefore, **√2 is irrational.** ✓

**Same logic applies to:** √3, √5, √7, √11 — all are irrational (proven identically)

**Key Rule:**
> If p is a prime number, then √p is always irrational.

---

### CONCEPT 5 — Rational Numbers and Their Decimal Expansions

**There are two types of decimal expansions for rational numbers:**

#### Type 1: Terminating Decimal
Occurs when the denominator's prime factors are **only 2 and/or 5**.

| Fraction | Denominator | Decimal |
|----------|-------------|---------|
| 7/8 | 8 = 2³ | 0.875 |
| 3/4 | 4 = 2² | 0.75 |
| 13/125 | 125 = 5³ | 0.104 |
| 7/20 | 20 = 2² × 5 | 0.35 |

#### Type 2: Non-Terminating Repeating Decimal
Occurs when the denominator has a prime factor **other than 2 and 5**.

| Fraction | Denominator | Decimal |
|----------|-------------|---------|
| 1/3 | 3 | 0.333... = 0.3̄ |
| 1/7 | 7 | 0.142857142857... |
| 2/11 | 11 | 0.1818... = 0.1̄8̄ |

**Quick Check Rule:**
> The decimal expansion of p/q is terminating **if and only if** q is of the form 2^m × 5^n.

---

## PART 2: IMPORTANT FORMULAS (Quick Revision)

| Formula | Description |
|---------|-------------|
| a = bq + r | Euclid's Division Lemma |
| HCF × LCM = a × b | Valid for two numbers a and b only |
| HCF → lowest powers of common primes | Prime factorization method |
| LCM → highest powers of all primes | Prime factorization method |
| q = 2^m × 5^n → terminating decimal | Decimal expansion rule |

---

## PART 3: EXAM TIPS

1. **HCF algorithm questions** — Always divide from larger to smaller; stop when remainder = 0
2. **LCM × HCF = product** — This formula is valid for **2 numbers only**, NOT for 3 numbers
3. **Irrational number proof** — Always use contradiction: assume rational → derive contradiction
4. **Decimal expansion** — Look only at the denominator's prime factors; the numerator does not matter
5. **Co-prime numbers** — Two numbers whose HCF = 1 are co-prime (e.g., 4 and 9)

---

## PART 4: Q&A BANK

---

**Q: What is the difference between HCF and LCM?**
A: HCF (Highest Common Factor) is the largest number that divides both numbers exactly. LCM (Least Common Multiple) is the smallest number that is divisible by both numbers. Example: HCF of 4 and 6 is 2; LCM of 4 and 6 is 12.

---

**Q: Is √4 an irrational number?**
A: No! √4 = 2, which is a rational number. Only the square roots of numbers that are not perfect squares are irrational — such as √2, √3, √5.

---

**Q: Is 0 a rational number?**
A: Yes! 0 can be written as 0/1, so it is a rational number.

---

**Q: Is π (pi) rational or irrational?**
A: π is irrational. Its decimal expansion is non-terminating and non-repeating: 3.14159265...

---

**Q: Can Euclid's Algorithm be used to find LCM as well?**
A: No. Euclid's Division Algorithm is used **only for HCF**. To find LCM, use the prime factorization method.

---

**Q: Is the sum of two irrational numbers always irrational?**
A: No. Example: (2 + √3) + (2 − √3) = 4, which is rational. However, √2 + √3 is irrational.

---

**Q: Is the product of two irrational numbers always irrational?**
A: No. Example: √2 × √2 = 2, which is rational. But √2 × √3 = √6, which is irrational.

---

**Q: Is 1 a prime number?**
A: No. A prime number must have exactly 2 factors — 1 and itself. The number 1 has only one factor (itself), so it is neither prime nor composite.

---

**Q: What are co-prime numbers?**
A: Two numbers are co-prime if their HCF = 1. For example, 8 and 9 are co-prime. Note: the numbers themselves do not need to be prime to be co-prime.

---

**Q: Is 3/8 a terminating or non-terminating decimal?**
A: 8 = 2³ — the denominator has only the prime factor 2, which is of the form 2^n. So 3/8 is **terminating**. 3/8 = 0.375.

---

**Q: Is 1/6 a terminating or non-terminating decimal?**
A: 6 = 2 × 3 — the denominator has 3 as a prime factor (other than 2 and 5). So 1/6 is **non-terminating repeating**. 1/6 = 0.1666... = 0.16̄

---

**Q: Does HCF × LCM = a × b work for three numbers too?**
A: No. This formula is valid **only for two numbers**. A different formula applies for three numbers, which is beyond this chapter.

---

**Q: What does "unique" mean in the Fundamental Theorem of Arithmetic?**
A: It means that every number has exactly one prime factorization (ignoring order). For example, 12 = 2 × 2 × 3. There is no other way to write 12 as a product of primes.

---

## PART 5: PRACTICE QUESTIONS

1. Find HCF(26, 91) using Euclid's Division Algorithm.
   *(Answer: 91 = 26×3 + 13; 26 = 13×2 + 0; HCF = 13)*

2. Check whether 6/15 has a terminating or non-terminating decimal expansion.
   *(Answer: 6/15 simplifies to 2/5; denominator = 5 = 5¹; terminating! Decimal = 0.4)*

3. Prove that √5 is irrational.
   *(Use the same contradiction method as the √2 proof)*

4. The LCM of two numbers is 182 and their HCF is 13. One number is 26. Find the other.
   *(Answer: Other number = HCF × LCM ÷ first number = 13 × 182 ÷ 26 = 91)*

5. Find the HCF and LCM of 12, 15, and 21 using prime factorization.
   *(12 = 2²×3; 15 = 3×5; 21 = 3×7; HCF = 3; LCM = 2²×3×5×7 = 420)*

---

## PART 6: CHAPTER SUMMARY

In Chapter 1, we covered 5 major concepts:

1. **Euclid's Division Lemma** — For any two integers: a = bq + r, where 0 ≤ r < b
2. **Euclid's Division Algorithm** — A step-by-step method to find HCF; repeat until remainder = 0
3. **Fundamental Theorem of Arithmetic** — Every number has a unique prime factorization; use it to find HCF and LCM
4. **Irrational Numbers** — √2, √3, √5... cannot be written as p/q; proved using contradiction
5. **Decimal Expansions** — If denominator = 2^m × 5^n → terminating; otherwise → non-terminating repeating

---

*File created for Vapi AI Teaching Test — AI Gurukool Phase 0*
