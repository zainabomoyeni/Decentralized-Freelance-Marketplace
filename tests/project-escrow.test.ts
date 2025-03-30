import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract interactions
const mockContractState = {
  projectIdCounter: 0,
  projects: new Map(),
  balances: new Map(),
}

// Mock contract functions
const mockContract = {
  createProject: (freelancer, amount) => {
    const projectId = mockContractState.projectIdCounter + 1
    mockContractState.projectIdCounter = projectId
    
    mockContractState.projects.set(projectId, {
      client: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      freelancer,
      amount,
      state: 1, // STATE_CREATED
      createdAt: 123456,
      completedAt: 0,
    })
    
    return { success: projectId }
  },
  
  fundProject: (projectId) => {
    const project = mockContractState.projects.get(projectId)
    if (!project) {
      return { error: 101 }
    }
    
    if (project.client !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
      return { error: 100 }
    }
    
    if (project.state !== 1) {
      return { error: 101 }
    }
    
    // Transfer funds from client to contract
    const clientBalance = mockContractState.balances.get(project.client) || 0
    if (clientBalance < project.amount) {
      return { error: 102 }
    }
    
    mockContractState.balances.set(project.client, clientBalance - project.amount)
    const contractBalance = mockContractState.balances.get("contract") || 0
    mockContractState.balances.set("contract", contractBalance + project.amount)
    
    // Update project state
    project.state = 2 // STATE_FUNDED
    mockContractState.projects.set(projectId, project)
    
    return { success: true }
  },
  
  startProject: (projectId) => {
    const project = mockContractState.projects.get(projectId)
    if (!project) {
      return { error: 101 }
    }
    
    if (project.freelancer !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
      return { error: 100 }
    }
    
    if (project.state !== 2) {
      return { error: 101 }
    }
    
    // Update project state
    project.state = 3 // STATE_IN_PROGRESS
    mockContractState.projects.set(projectId, project)
    
    return { success: true }
  },
  
  completeProject: (projectId) => {
    const project = mockContractState.projects.get(projectId)
    if (!project) {
      return { error: 101 }
    }
    
    if (project.client !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
      return { error: 100 }
    }
    
    if (project.state !== 3) {
      return { error: 101 }
    }
    
    // Transfer funds from contract to freelancer
    const contractBalance = mockContractState.balances.get("contract") || 0
    if (contractBalance < project.amount) {
      return { error: 102 }
    }
    
    mockContractState.balances.set("contract", contractBalance - project.amount)
    const freelancerBalance = mockContractState.balances.get(project.freelancer) || 0
    mockContractState.balances.set(project.freelancer, freelancerBalance + project.amount)
    
    // Update project state
    project.state = 4 // STATE_COMPLETED
    project.completedAt = 123789
    mockContractState.projects.set(projectId, project)
    
    return { success: true }
  },
  
  getProject: (projectId) => {
    return mockContractState.projects.get(projectId)
  },
}

describe("Project Escrow Contract", () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockContractState.projectIdCounter = 0
    mockContractState.projects.clear()
    mockContractState.balances.clear()
    
    // Set up initial balances
    mockContractState.balances.set("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 1000)
  })
  
  it("should create a project successfully", () => {
    const freelancer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const amount = 100
    
    const result = mockContract.createProject(freelancer, amount)
    expect(result.success).toBe(1)
    
    const project = mockContract.getProject(1)
    expect(project).toBeDefined()
    expect(project.client).toBe("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    expect(project.freelancer).toBe(freelancer)
    expect(project.amount).toBe(amount)
    expect(project.state).toBe(1) // STATE_CREATED
  })
  
  it("should fund a project successfully", () => {
    const freelancer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const amount = 100
    
    // Create project
    const createResult = mockContract.createProject(freelancer, amount)
    const projectId = createResult.success
    
    // Fund project
    const fundResult = mockContract.fundProject(projectId)
    expect(fundResult.success).toBe(true)
    
    // Check project state
    const project = mockContract.getProject(projectId)
    expect(project.state).toBe(2) // STATE_FUNDED
    
    // Check balances
    expect(mockContractState.balances.get("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")).toBe(900)
    expect(mockContractState.balances.get("contract")).toBe(100)
  })
  
  it("should start a project successfully", () => {
    const freelancer = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" // Freelancer is the sender in this test
    const amount = 100
    
    // Create and fund project
    const createResult = mockContract.createProject(freelancer, amount)
    const projectId = createResult.success
    mockContract.fundProject(projectId)
    
    // Start project
    const startResult = mockContract.startProject(projectId)
    expect(startResult.success).toBe(true)
    
    // Check project state
    const project = mockContract.getProject(projectId)
    expect(project.state).toBe(3) // STATE_IN_PROGRESS
  })
  
  it("should complete a project successfully", () => {
    const freelancer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const amount = 100
    
    // Create and fund project
    const createResult = mockContract.createProject(freelancer, amount)
    const projectId = createResult.success
    mockContract.fundProject(projectId)
    
    // Set project state to IN_PROGRESS
    const project = mockContract.getProject(projectId)
    project.state = 3 // STATE_IN_PROGRESS
    mockContractState.projects.set(projectId, project)
    
    // Complete project
    const completeResult = mockContract.completeProject(projectId)
    expect(completeResult.success).toBe(true)
    
    // Check project state
    const updatedProject = mockContract.getProject(projectId)
    expect(updatedProject.state).toBe(4) // STATE_COMPLETED
    expect(updatedProject.completedAt).toBe(123789)
    
    // Check balances
    expect(mockContractState.balances.get("contract")).toBe(0)
    expect(mockContractState.balances.get(freelancer)).toBe(100)
  })
})

