;; Milestone Tracking Contract
;; This contract manages project progress and partial payments

(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_INVALID_STATE u101)
(define-constant ERR_INVALID_MILESTONE u102)
(define-constant ERR_INSUFFICIENT_FUNDS u103)

;; Milestone states
(define-constant STATE_CREATED u1)
(define-constant STATE_APPROVED u2)
(define-constant STATE_COMPLETED u3)
(define-constant STATE_PAID u4)

;; Milestone data structure
(define-map milestones
  { project-id: uint, milestone-id: uint }
  {
    description: (string-utf8 256),
    amount: uint,
    state: uint,
    created-at: uint,
    completed-at: uint,
    paid-at: uint
  })

;; Project milestone counter
(define-map project-milestone-counters
  { project-id: uint }
  { count: uint })

;; Create a new milestone for a project
(define-public (create-milestone (project-id uint) (description (string-utf8 256)) (amount uint))
  (let (
    (project (unwrap! (contract-call? .project-escrow get-project project-id) (err ERR_INVALID_STATE)))
    (milestone-counter (default-to { count: u0 } (map-get? project-milestone-counters { project-id: project-id })))
    (milestone-id (+ (get count milestone-counter) u1))
  )
    ;; Only the client can create milestones
    (asserts! (is-eq tx-sender (get client project)) (err ERR_UNAUTHORIZED))

    ;; Update milestone counter
    (map-set project-milestone-counters
      { project-id: project-id }
      { count: milestone-id })

    ;; Create the milestone
    (map-set milestones
      { project-id: project-id, milestone-id: milestone-id }
      {
        description: description,
        amount: amount,
        state: STATE_CREATED,
        created-at: block-height,
        completed-at: u0,
        paid-at: u0
      })

    (ok milestone-id)))

;; Approve a milestone (client approves the milestone)
(define-public (approve-milestone (project-id uint) (milestone-id uint))
  (let (
    (project (unwrap! (contract-call? .project-escrow get-project project-id) (err ERR_INVALID_STATE)))
    (milestone (unwrap! (map-get? milestones { project-id: project-id, milestone-id: milestone-id }) (err ERR_INVALID_MILESTONE)))
  )
    ;; Only the client can approve milestones
    (asserts! (is-eq tx-sender (get client project)) (err ERR_UNAUTHORIZED))
    ;; Milestone must be in CREATED state
    (asserts! (is-eq (get state milestone) STATE_CREATED) (err ERR_INVALID_STATE))

    ;; Update milestone state
    (map-set milestones
      { project-id: project-id, milestone-id: milestone-id }
      (merge milestone { state: STATE_APPROVED })
    )

    (ok true)))

;; Mark milestone as completed (freelancer marks work as done)
(define-public (complete-milestone (project-id uint) (milestone-id uint))
  (let (
    (project (unwrap! (contract-call? .project-escrow get-project project-id) (err ERR_INVALID_STATE)))
    (milestone (unwrap! (map-get? milestones { project-id: project-id, milestone-id: milestone-id }) (err ERR_INVALID_MILESTONE)))
  )
    ;; Only the freelancer can mark milestones as completed
    (asserts! (is-eq tx-sender (get freelancer project)) (err ERR_UNAUTHORIZED))
    ;; Milestone must be in APPROVED state
    (asserts! (is-eq (get state milestone) STATE_APPROVED) (err ERR_INVALID_STATE))

    ;; Update milestone state
    (map-set milestones
      { project-id: project-id, milestone-id: milestone-id }
      (merge milestone {
        state: STATE_COMPLETED,
        completed-at: block-height
      })
    )

    (ok true)))

;; Pay for a completed milestone
(define-public (pay-milestone (project-id uint) (milestone-id uint))
  (let (
    (project (unwrap! (contract-call? .project-escrow get-project project-id) (err ERR_INVALID_STATE)))
    (milestone (unwrap! (map-get? milestones { project-id: project-id, milestone-id: milestone-id }) (err ERR_INVALID_MILESTONE)))
  )
    ;; Only the client can pay for milestones
    (asserts! (is-eq tx-sender (get client project)) (err ERR_UNAUTHORIZED))
    ;; Milestone must be in COMPLETED state
    (asserts! (is-eq (get state milestone) STATE_COMPLETED) (err ERR_INVALID_STATE))

    ;; Transfer payment to freelancer
    (try! (stx-transfer? (get amount milestone) tx-sender (get freelancer project)))

    ;; Update milestone state
    (map-set milestones
      { project-id: project-id, milestone-id: milestone-id }
      (merge milestone {
        state: STATE_PAID,
        paid-at: block-height
      })
    )

    (ok true)))

;; Read-only function to get milestone details
(define-read-only (get-milestone (project-id uint) (milestone-id uint))
  (map-get? milestones { project-id: project-id, milestone-id: milestone-id }))

;; Read-only function to get milestone count for a project
(define-read-only (get-milestone-count (project-id uint))
  (default-to { count: u0 } (map-get? project-milestone-counters { project-id: project-id })))

