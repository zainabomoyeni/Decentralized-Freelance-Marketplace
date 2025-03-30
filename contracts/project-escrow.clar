;; Project Escrow Contract
;; This contract holds client funds until work is completed

(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_INVALID_STATE u101)
(define-constant ERR_INSUFFICIENT_FUNDS u102)

;; Project states
(define-constant STATE_CREATED u1)
(define-constant STATE_FUNDED u2)
(define-constant STATE_IN_PROGRESS u3)
(define-constant STATE_COMPLETED u4)
(define-constant STATE_CANCELLED u5)
(define-constant STATE_DISPUTED u6)

;; Project data structure
(define-map projects
  { project-id: uint }
  {
    client: principal,
    freelancer: principal,
    amount: uint,
    state: uint,
    created-at: uint,
    completed-at: uint
  })

;; Counter for project IDs
(define-data-var project-id-counter uint u0)

;; Create a new project
(define-public (create-project (freelancer principal) (amount uint))
  (let ((project-id (+ (var-get project-id-counter) u1)))
    (var-set project-id-counter project-id)
    (map-set projects
      { project-id: project-id }
      {
        client: tx-sender,
        freelancer: freelancer,
        amount: amount,
        state: STATE_CREATED,
        created-at: block-height,
        completed-at: u0
      })
    (ok project-id)))

;; Fund a project (client deposits funds)
(define-public (fund-project (project-id uint))
  (let ((project (unwrap! (map-get? projects { project-id: project-id }) (err ERR_INVALID_STATE))))
    (asserts! (is-eq tx-sender (get client project)) (err ERR_UNAUTHORIZED))
    (asserts! (is-eq (get state project) STATE_CREATED) (err ERR_INVALID_STATE))
    (try! (stx-transfer? (get amount project) tx-sender (as-contract tx-sender)))
    (map-set projects
      { project-id: project-id }
      (merge project { state: STATE_FUNDED })
    )
    (ok true)))

;; Start a project (freelancer accepts)
(define-public (start-project (project-id uint))
  (let ((project (unwrap! (map-get? projects { project-id: project-id }) (err ERR_INVALID_STATE))))
    (asserts! (is-eq tx-sender (get freelancer project)) (err ERR_UNAUTHORIZED))
    (asserts! (is-eq (get state project) STATE_FUNDED) (err ERR_INVALID_STATE))
    (map-set projects
      { project-id: project-id }
      (merge project { state: STATE_IN_PROGRESS })
    )
    (ok true)))

;; Complete a project (client confirms completion)
(define-public (complete-project (project-id uint))
  (let ((project (unwrap! (map-get? projects { project-id: project-id }) (err ERR_INVALID_STATE))))
    (asserts! (is-eq tx-sender (get client project)) (err ERR_UNAUTHORIZED))
    (asserts! (is-eq (get state project) STATE_IN_PROGRESS) (err ERR_INVALID_STATE))

    ;; Transfer funds to freelancer
    (try! (as-contract (stx-transfer? (get amount project) tx-sender (get freelancer project))))

    (map-set projects
      { project-id: project-id }
      (merge project {
        state: STATE_COMPLETED,
        completed-at: block-height
      })
    )
    (ok true)))

;; Cancel a project (only possible in CREATED or FUNDED state)
(define-public (cancel-project (project-id uint))
  (let ((project (unwrap! (map-get? projects { project-id: project-id }) (err ERR_INVALID_STATE))))
    (asserts! (is-eq tx-sender (get client project)) (err ERR_UNAUTHORIZED))
    (asserts! (or (is-eq (get state project) STATE_CREATED) (is-eq (get state project) STATE_FUNDED)) (err ERR_INVALID_STATE))

    ;; Return funds to client if already funded
    (if (is-eq (get state project) STATE_FUNDED)
      (try! (as-contract (stx-transfer? (get amount project) tx-sender (get client project))))
      true)

    (map-set projects
      { project-id: project-id }
      (merge project { state: STATE_CANCELLED })
    )
    (ok true)))

;; Raise a dispute (either client or freelancer can do this)
(define-public (raise-dispute (project-id uint))
  (let ((project (unwrap! (map-get? projects { project-id: project-id }) (err ERR_INVALID_STATE))))
    (asserts! (or (is-eq tx-sender (get client project)) (is-eq tx-sender (get freelancer project))) (err ERR_UNAUTHORIZED))
    (asserts! (is-eq (get state project) STATE_IN_PROGRESS) (err ERR_INVALID_STATE))

    (map-set projects
      { project-id: project-id }
      (merge project { state: STATE_DISPUTED })
    )
    (ok true)))

;; Read-only function to get project details
(define-read-only (get-project (project-id uint))
  (map-get? projects { project-id: project-id }))

