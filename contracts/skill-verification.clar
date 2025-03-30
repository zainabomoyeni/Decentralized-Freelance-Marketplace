;; Skill Verification Contract
;; This contract validates freelancer abilities and credentials

(define-data-var admin principal tx-sender)

;; Map to store verified skills for freelancers
(define-map freelancer-skills
  { freelancer: principal, skill: (string-ascii 64) }
  { verified: bool, timestamp: uint, verifier: principal })

;; Map to store endorsements for skills
(define-map skill-endorsements
  { freelancer: principal, skill: (string-ascii 64), endorser: principal }
  { rating: uint, comment: (string-utf8 256), timestamp: uint })

;; Public function to verify a skill
(define-public (verify-skill (freelancer principal) (skill (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (ok (map-set freelancer-skills
      { freelancer: freelancer, skill: skill }
      { verified: true, timestamp: block-height, verifier: tx-sender }))))

;; Public function to endorse a skill
(define-public (endorse-skill (freelancer principal) (skill (string-ascii 64)) (rating uint) (comment (string-utf8 256)))
  (begin
    (asserts! (<= rating u5) (err u101))
    (asserts! (is-some (map-get? freelancer-skills { freelancer: freelancer, skill: skill })) (err u102))
    (ok (map-set skill-endorsements
      { freelancer: freelancer, skill: skill, endorser: tx-sender }
      { rating: rating, comment: comment, timestamp: block-height }))))

;; Read-only function to check if a skill is verified
(define-read-only (is-skill-verified (freelancer principal) (skill (string-ascii 64)))
  (default-to false (get verified (map-get? freelancer-skills { freelancer: freelancer, skill: skill }))))

;; Read-only function to get skill verification details
(define-read-only (get-skill-verification (freelancer principal) (skill (string-ascii 64)))
  (map-get? freelancer-skills { freelancer: freelancer, skill: skill }))

;; Read-only function to get skill endorsement
(define-read-only (get-skill-endorsement (freelancer principal) (skill (string-ascii 64)) (endorser principal))
  (map-get? skill-endorsements { freelancer: freelancer, skill: skill, endorser: endorser }))

