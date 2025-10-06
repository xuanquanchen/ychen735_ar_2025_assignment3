import numpy as np

def projection_matrix(fx=650, fy=650, ox=325, oy=325, W=640, H=480, n=0.1, f=1000.0, shx=0.0):
    return np.array([
        [2*fx / W, 2*shx / W, (W-2*ox) / W, 0],
        [0, 2*fy / H, (-H+2*oy) / H, 0],
        [0, 0, -(f+n) / (f-n), -2*f*n / (f-n)],
        [0, 0, -1, 0]
    ], dtype=float)
    
def camera_to_pixel(Pc, fx=650, fy=650, ox=325, oy=325, W=640, H=480, n=0.1, f=1000.0, shx=0.0):
    Mproj = projection_matrix(fx, fy, ox, oy, W, H, n, f)
    
    Pc_h = np.append(Pc, 1.0)
    
    Pclip = Mproj @ Pc_h
    
    x_ndc, y_ndc, z_ndc = Pclip[:3] / Pclip[3]
    
    u = 0.5 * (x_ndc + 1) * W
    v = 0.5 * (1 - y_ndc) * H
    
    return Mproj, Pclip, (x_ndc,y_ndc,z_ndc), (u,v)

if __name__ == "__main__":
    print("Enter camera intrinsics and OpenGL parameters below:\n")
    
    fx = float(input("fx = "))
    fy = float(input("fy = "))
    ox = float(input("ox = "))
    oy = float(input("oy = "))
    W = float(input("Width (W) = "))
    H = float(input("Height (H) = "))
    n = float(input("Near plane (n) = "))
    f = float(input("Far plane (f) = "))
    
    print("\nEnter camera point coordinates (Pc = [x, y, z]):")
    x = float(input("x = "))
    y = float(input("y = "))
    z = float(input("z = "))
    
    Pc = np.array([x, y, z])

    Mproj, Pclip, (x_ndc, y_ndc, z_ndc), (u, v) = camera_to_pixel(Pc, fx, fy, ox, oy, W, H, n, f)

    print("\n=== Results ===")
    print("Projection matrix:\n", Mproj)
    print("Clip coordinates (x_c, y_c, z_c, w_c):", Pclip)
    print("NDC coordinates (x_ndc, y_ndc, z_ndc):", (x_ndc, y_ndc, z_ndc))
    print("Pixel coordinates (u, v):", (u, v))