import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract interactions
const mockContractState = {
  projectMilestoneCounters: new Map(),
  milestones: new Map(),
}

// Mock project-escrow contract
const mockProjectEscrow = {
  getProject: (projectId) => {
    if (projectId === 1) {
      return {
        client: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        freelancer: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
        amount: 1000,
        state: 3, // STATE_IN_PROGRESS
        createdAt: 123456,
        completedAt: 0,
      }
    }
    return null
  },
}

// Mock contract functions
const mockContract = {
  createMilestone: (projectId, description, amount) => {
    const project = mockProjectEscrow.getProject(projectId)
    if (!project) {
      return { error: 101 }
    }
    
    if (project.client !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
      return { error: 100 }
    }
    
    const counter = mockContractState.projectMilestoneCounters.get(projectId) || { count: 0 }
    const milestoneId = counter.count + 1
    
    // Update counter
    mockContractState.projectMilestoneCounters.set(projectId, { count: milestoneId })
    
    // Create milestone
    const key = `${projectId}-${milestoneId}`
    mockContractState.milestones.set(key, {
      description,
      amount,
      state: 1, // STATE_CREATED
      createdAt: 123456,
      completedAt: 0,
      paidAt: 0,
    })
    
    return { success: milestoneId }
  },
  
  approveMilestone: (projectId, milestoneId) => {
    const project = mockProjectEscrow.getProject(projectId)
    if (!project) {
      return { error: 101 }
    }
    
    if (project.client !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
      return { error: 100 }
    }
    
    const key = `${projectId}-${milestoneId}`
    const milestone = mockContractState.milestones.get(key)
    if (!milestone) {
      return { error: 102 }
    }
    
    if (milestone.state !== 1) {
      return { error: 101 }
    }
    
    // Update milestone state
    milestone.state = 2 // STATE_APPROVED
    mockContractState.milestones.set(key, milestone)
    
    return { success: true }
  },
  
  completeMilestone: (projectId, milestoneId) => {
    const project = mockProjectEscrow.getProject(projectId)
    if (!project) {
      return { error: 101 }
    }
    
    if (project.freelancer !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
      return { error: 100 }
    }
    
    const key = `${projectId}-${milestoneId}`
    const milestone = mockContractState.milestones.get(key)
    if (!milestone) {
      return { error: 102 }
    }
    
    if (milestone.state !== 2) {
      return { error: 101 }
    }
    
    // Update milestone state
    milestone.state = 3 // STATE_COMPLETED
    milestone.completedAt = 123789
    mockContractState.milestones.set(key, milestone)
    
    return { success: true }
  },
  
  payMilestone: (projectId, milestoneId) => {
    const project = mockProjectEscrow.getProject(projectId)
    if (!project) {
      return { error: 101 }
    }
    
    if (project.client !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
      return { error: 100 }
    }
    
    const key = `${projectId}-${milestoneId}`
    const milestone = mockContractState.milestones.get(key)
    if (!milestone) {
      return { error: 102 }
    }
    
    if (milestone.state !== 3) {
      return { error: 101 }
    }
    
    // Update milestone state
    milestone.state = 4 // STATE_PAID
    milestone.paidAt = 123999
    mockContractState.milestones.set(key, milestone)
    
    return { success: true }
  },
  
  getMilestone: (projectId, milestoneId) => {
    const key = `${projectId}-${milestoneId}`
    return mockContractState.milestones.get(key)
  },
  
  getMilestoneCount: (projectId) => {
    return mockContractState.projectMilestoneCounters.get(projectId) || { count: 0 }
  },
}

describe("Milestone Tracking Contract", () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockContractState.projectMilestoneCounters.clear()
    mockContractState.milestones.clear()
    
    // Mock tx-sender
    global.txSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  })
  
  it("should create a milestone successfully", () => {
    const projectId = 1
    const description = "Frontend Development"
    const amount = 500
    
    const result = mockContract.createMilestone(projectId, description, amount)
    expect(result.success).toBe(1)
    
    const milestone = mockContract.getMilestone(projectId, 1)
    expect(milestone).toBeDefined()
    expect(milestone.description).toBe(description)
    expect(milestone.amount).toBe(amount)
    expect(milestone.state).toBe(1) // STATE_CREATED
  })
  
  it("should approve a milestone successfully", () => {
    const projectId = 1
    const description = "Frontend Development"
    const amount = 500
    
    // Create milestone
    mockContract.createMilestone(projectId, description, amount)
    
    // Approve milestone
    const approveResult = mockContract.approveMilestone(projectId, 1)
    expect(approveResult.success).toBe(true)
    
    // Check milestone state
    const milestone = mockContract.getMilestone(projectId, 1)
    expect(milestone.state).toBe(2) // STATE_APPROVED
  })
  
  it("should mark a milestone as completed successfully", () => {
    const projectId = 1
    const description = "Frontend Development"
    const amount = 500
    
    // Create milestone
    mockContract.createMilestone(projectId, description, amount)
    
    // Approve milestone
    mockContract.approveMilestone(projectId, 1)
    
    // Set tx-sender to freelancer for this test
    global.txSender = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    
    // Complete milestone
    const completeResult = mockContract.completeMilestone(projectId, 1)
    expect(completeResult.success).toBe(true)
    
    // Check milestone state
    const milestone = mockContract.getMilestone(projectId, 1)
    expect(milestone.state).toBe(3) // STATE_COMPLETED
    expect(milestone.completedAt).toBe(123789)
  })
  
  it("should pay for a milestone successfully", () => {
    const projectId = 1
    const description = "Frontend Development"
    const amount = 500
    
    // Create milestone
    mockContract.createMilestone(projectId, description, amount)
    
    // Approve milestone
    mockContract.approveMilestone(projectId, 1)
    
    // Set milestone as completed
    const key = `${projectId}-1`
    const milestone = mockContractState.milestones.get(key)
    milestone.state = 3 // STATE_COMPLETED
    milestone.completedAt = 123789
    mockContractState.milestones.set(key, milestone)
    
    // Pay for milestone
    const payResult = mockContract.payMilestone(projectId, 1)
    expect(payResult.success).toBe(true)
    
    // Check milestone state
    const updatedMilestone = mockContract.getMilestone(projectId, 1)
    expect(updatedMilestone.state).toBe(4) // STATE_PAID
    expect(updatedMilestone.paidAt).toBe(123999)
  })
})

